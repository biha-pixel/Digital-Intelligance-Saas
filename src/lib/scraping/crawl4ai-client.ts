import crypto from "crypto";
import {
  ScrapingProvider,
  ScrapeRequest,
  ScrapeResponse,
  CrawlRequest,
  CrawlResponse,
  HealthCheckResult,
} from "./types";
import { CXPULSE_USER_AGENT } from "./robots";
import { validateUrlForScraping } from "@/lib/security/ssrf";
import {
  ScrapingError,
  SSRFValidationError,
  ScrapingTimeoutError,
  ScrapingRateLimitError,
  ScrapingConnectionError,
  ContentSizeExceededError,
} from "./errors";

/**
 * Maximum default response body size (10 MB) to prevent memory exhaustion / payload bombs.
 */
const DEFAULT_MAX_CONTENT_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * Default timeout in milliseconds for single-page scrape operations.
 */
const DEFAULT_TIMEOUT_MS = 30000;

/**
 * Default maximum retries for transient errors.
 */
const DEFAULT_MAX_RETRIES = 3;

/**
 * Concrete implementation of ScrapingProvider that communicates with a self-hosted Crawl4AI server.
 *
 * Target Data Flow:
 * Application → ScrapingProvider → Crawl4AIProvider → Crawl4AI Engine
 */
export class Crawl4AIProvider implements ScrapingProvider {
  public readonly name = "Crawl4AI";
  private baseUrl: string;
  private apiToken?: string;

  constructor(options?: { baseUrl?: string; apiToken?: string }) {
    this.baseUrl = (
      options?.baseUrl ||
      process.env.CRAWL4AI_BASE_URL ||
      process.env.CRAWL4AI_SERVICE_URL ||
      "http://localhost:11235"
    ).replace(/\/+$/, ""); // Trim trailing slashes
    this.apiToken = options?.apiToken || process.env.CRAWL4AI_API_TOKEN;
  }

  /**
   * Health Check: queries the Crawl4AI server's `/health` endpoint to verify service readiness.
   */
  public async healthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: "GET",
        headers: this.getHeaders(),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const latencyMs = Date.now() - startTime;

      if (response.ok) {
        let details: Record<string, unknown> = {};
        try {
          details = await response.json();
        } catch {
          details = { rawStatus: response.statusText };
        }

        return {
          healthy: true,
          provider: this.name,
          latencyMs,
          message: "Crawl4AI service is reachable and healthy",
          version: typeof details.version === "string" ? details.version : undefined,
          details,
        };
      }

      return {
        healthy: false,
        provider: this.name,
        latencyMs,
        message: `Health check returned non-OK status: HTTP ${response.status}`,
      };
    } catch (error: unknown) {
      clearTimeout(timeout);
      const latencyMs = Date.now() - startTime;
      const isTimeout = error instanceof Error && error.name === "AbortError";

      return {
        healthy: false,
        provider: this.name,
        latencyMs,
        message: isTimeout
          ? "Health check timed out after 5000ms"
          : error instanceof Error
          ? error.message
          : "Crawl4AI service connection failed",
      };
    }
  }

  /**
   * Fetches and normalizes a single web page with SSRF guards, timeouts, retries, and size checks.
   */
  public async fetch(request: ScrapeRequest): Promise<ScrapeResponse> {
    // 1. SSRF Pre-flight Defense Check
    const ssrfCheck = await validateUrlForScraping(request.url);
    if (!ssrfCheck.valid) {
      throw new SSRFValidationError(
        `SSRF validation rejected target URL: ${ssrfCheck.error}`,
        { url: request.url }
      );
    }

    const targetUrl = ssrfCheck.normalizedUrl;
    const maxRetries = request.maxRetries ?? DEFAULT_MAX_RETRIES;
    let lastError: unknown;

    // 2. Execution with Exponential Backoff Retries
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.executeSingleFetch(targetUrl, request);
      } catch (error: unknown) {
        lastError = error;

        // Check if error is retryable
        const isRetryable =
          error instanceof ScrapingTimeoutError ||
          error instanceof ScrapingRateLimitError ||
          error instanceof ScrapingConnectionError ||
          (error instanceof ScrapingError && error.isRetryable);

        if (!isRetryable || attempt === maxRetries) {
          throw error;
        }

        // Calculate exponential backoff with jitter: backoff = base * 2^attempt + jitter
        const baseDelayMs = 500;
        const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
        const jitter = Math.floor(Math.random() * 200);
        const delayMs = exponentialDelay + jitter;

        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    throw lastError;
  }

  /**
   * Internal helper executing a single fetch attempt against Crawl4AI.
   */
  private async executeSingleFetch(
    targetUrl: string,
    request: ScrapeRequest
  ): Promise<ScrapeResponse> {
    const startTime = Date.now();
    const timeoutMs = request.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const maxSizeBytes = request.maxContentSizeBytes ?? DEFAULT_MAX_CONTENT_SIZE_BYTES;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const crawlPayload = {
        urls: targetUrl,
        priority: 5,
        word_count_threshold: 10,
        screenshot: false,
        user_agent: CXPULSE_USER_AGENT,
        wait_for: request.waitForSelector,
        delay_before_return: request.delayMs ? request.delayMs / 1000 : 0.5,
        magic: true,
        remove_overlay_elements: true,
        bypass_cache: request.bypassCache ?? false,
      };

      let response: Response;
      try {
        response = await fetch(`${this.baseUrl}/crawl`, {
          method: "POST",
          headers: {
            ...this.getHeaders(),
            "Content-Type": "application/json",
            ...request.headers,
          },
          body: JSON.stringify(crawlPayload),
          signal: controller.signal,
        });
      } catch (fetchErr: unknown) {
        if (fetchErr instanceof Error && fetchErr.name === "AbortError") {
          throw new ScrapingTimeoutError(timeoutMs, targetUrl);
        }
        throw new ScrapingConnectionError(
          `Failed to connect to Crawl4AI at ${this.baseUrl}: ${
            fetchErr instanceof Error ? fetchErr.message : "Network error"
          }`,
          { baseUrl: this.baseUrl, targetUrl },
          fetchErr
        );
      } finally {
        clearTimeout(timeout);
      }

      const executionTimeMs = Date.now() - startTime;

      // Check HTTP Status Codes
      if (response.status === 429) {
        const retryAfterHeader = response.headers.get("retry-after");
        const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) : undefined;
        throw new ScrapingRateLimitError(targetUrl, retryAfter);
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown server error");
        const isTransient = [502, 503, 504].includes(response.status);

        throw new ScrapingError(
          `Crawl4AI returned HTTP ${response.status}: ${errorText}`,
          {
            statusCode: response.status,
            isRetryable: isTransient,
            context: { targetUrl, status: response.status, errorText },
          }
        );
      }

      // Check Content-Length header if present
      const contentLengthHeader = response.headers.get("content-length");
      if (contentLengthHeader) {
        const declaredSize = parseInt(contentLengthHeader, 10);
        if (declaredSize > maxSizeBytes) {
          throw new ContentSizeExceededError(declaredSize, maxSizeBytes, targetUrl);
        }
      }

      const rawJson = await response.json();

      // Normalize Crawl4AI output format
      const data = Array.isArray(rawJson)
        ? rawJson[0]
        : rawJson.results
        ? rawJson.results[0]
        : rawJson;

      if (!data) {
        throw new ScrapingError("Crawl4AI returned an empty response payload", {
          statusCode: 502,
          isRetryable: true,
          context: { targetUrl },
        });
      }

      const html: string = data.html || data.cleaned_html || "";
      const text: string = data.text || data.extracted_content || "";
      const markdown: string = data.markdown || "";

      // Enforce actual body size limits
      const totalPayloadBytes = Buffer.byteLength(html || text, "utf8");
      if (totalPayloadBytes > maxSizeBytes) {
        throw new ContentSizeExceededError(totalPayloadBytes, maxSizeBytes, targetUrl);
      }

      // Compute deterministic SHA-256 content hash
      const contentHash = crypto
        .createHash("sha256")
        .update(html || text)
        .digest("hex");

      const finalUrl = data.url || targetUrl;

      return {
        url: finalUrl,
        sourceUrl: request.url,
        statusCode: data.status_code || response.status,
        html,
        text,
        markdown,
        contentHash,
        fetchedAt: new Date().toISOString(),
        executionTimeMs,
        metadata: {
          title: data.metadata?.title || data.title,
          description: data.metadata?.description || data.description,
          language: data.metadata?.language || data.language,
          statusCode: data.status_code || response.status,
          responseTimeMs: executionTimeMs,
          contentLength: totalPayloadBytes,
          redirectChain: data.redirect_chain || [targetUrl],
        },
      };
    } catch (error: unknown) {
      clearTimeout(timeout);
      if (error instanceof Error && error.name === "AbortError") {
        throw new ScrapingTimeoutError(timeoutMs, targetUrl);
      }
      throw error;
    }
  }

  /**
   * Crawls a batch of URLs concurrently with bounded concurrency.
   */
  public async crawl(request: CrawlRequest): Promise<CrawlResponse> {
    const startTime = Date.now();
    const concurrency = Math.max(1, Math.min(request.maxConcurrency || 3, 10));
    const urls = request.urls;

    const results: ScrapeResponse[] = [];
    const errors: Array<{ url: string; error: string; code?: string }> = [];

    // Worker pool queue
    let currentIndex = 0;

    const worker = async () => {
      while (currentIndex < urls.length) {
        const index = currentIndex++;
        const url = urls[index];

        try {
          const res = await this.fetch({
            url,
            delayMs: request.delayMs,
            timeoutMs: request.timeoutMs,
            bypassCache: request.bypassCache,
            maxRetries: request.maxRetries,
          });
          results.push(res);
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : "Scrape failed";
          const errorCode = err instanceof ScrapingError ? err.code : undefined;
          errors.push({ url, error: errorMessage, code: errorCode });
        }
      }
    };

    const workers = Array.from({ length: Math.min(concurrency, urls.length) }, () =>
      worker()
    );
    await Promise.all(workers);

    return {
      total: urls.length,
      successful: results.length,
      failed: errors.length,
      results,
      errors,
      totalDurationMs: Date.now() - startTime,
    };
  }

  /**
   * Generates standard HTTP headers for Crawl4AI communication including Bearer auth.
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: "application/json",
      "User-Agent": CXPULSE_USER_AGENT,
    };

    if (this.apiToken) {
      headers["Authorization"] = `Bearer ${this.apiToken}`;
    }

    return headers;
  }
}
