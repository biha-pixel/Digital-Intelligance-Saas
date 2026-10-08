import crypto from "crypto";
import { ScrapingProvider, ScrapeRequest, ScrapeResponse } from "./types";
import { CXPULSE_USER_AGENT } from "./robots";

export class Crawl4AIProvider implements ScrapingProvider {
  public readonly name = "Crawl4AI";
  private serviceUrl: string;
  private apiToken?: string;

  constructor() {
    this.serviceUrl =
      process.env.CRAWL4AI_SERVICE_URL || "http://localhost:11235";
    this.apiToken = process.env.CRAWL4AI_API_TOKEN;
  }

  /**
   * Checks if the Crawl4AI service container is reachable and healthy.
   */
  public async healthCheck(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(`${this.serviceUrl}/health`, {
        method: "GET",
        headers: this.getHeaders(),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Dispatches a scrape request to the Crawl4AI container and parses the output.
   */
  public async fetch(request: ScrapeRequest): Promise<ScrapeResponse> {
    const startTime = Date.now();
    const timeoutMs = request.timeoutMs ?? 30000;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const payload = {
        urls: request.url,
        priority: 5,
        word_count_threshold: 10,
        screenshot: false,
        user_agent: CXPULSE_USER_AGENT,
        wait_for: request.waitForSelector,
        delay_before_return: request.delayMs ? request.delayMs / 1000 : 0.5,
        magic: true,
        remove_overlay_elements: true,
      };

      const response = await fetch(`${this.serviceUrl}/crawl`, {
        method: "POST",
        headers: {
          ...this.getHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const executionTimeMs = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        throw new Error(
          `Crawl4AI returned HTTP ${response.status}: ${errorText}`
        );
      }

      const result = await response.json();

      // Crawl4AI response structure can be an array of results or single object
      const data = Array.isArray(result) ? result[0] : (result.results ? result.results[0] : result);

      const html = data?.html || data?.cleaned_html || "";
      const text = data?.text || data?.extracted_content || "";
      const markdown = data?.markdown || "";

      // Compute deterministic SHA-256 hash of the scraped payload
      const contentHash = crypto
        .createHash("sha256")
        .update(html || text)
        .digest("hex");

      return {
        url: request.url,
        statusCode: response.status,
        html,
        text,
        markdown,
        contentHash,
        fetchedAt: new Date().toISOString(),
        executionTimeMs,
        metadata: {
          title: data?.metadata?.title || data?.title,
          description: data?.metadata?.description,
          language: data?.metadata?.language,
          statusCode: data?.status_code || 200,
        },
      };
    } catch (error: unknown) {
      clearTimeout(timeout);
      const executionTimeMs = Date.now() - startTime;

      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(
          `Crawl4AI scrape timed out after ${timeoutMs}ms for ${request.url}`
        );
      }

      throw error;
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (this.apiToken) {
      headers["Authorization"] = `Bearer ${this.apiToken}`;
    }
    return headers;
  }
}
