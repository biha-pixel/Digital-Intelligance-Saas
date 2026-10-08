/**
 * Typed Error Hierarchy for Scraping & Ingestion
 *
 * Provides clear, actionable error categorization across the scraping pipeline
 * to distinguish between transient network issues, security rejections, and
 * permanent client errors.
 */

export class ScrapingError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;
  public readonly isRetryable: boolean;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    options: {
      code?: string;
      statusCode?: number;
      isRetryable?: boolean;
      context?: Record<string, unknown>;
      cause?: unknown;
    } = {}
  ) {
    super(message);
    this.name = "ScrapingError";
    this.code = options.code || "SCRAPING_ERROR";
    this.statusCode = options.statusCode;
    this.isRetryable = options.isRetryable ?? false;
    this.context = options.context;
    if (options.cause) {
      this.cause = options.cause;
    }
  }
}

/**
 * Thrown when a target URL violates SSRF security policies (private IP, cloud metadata, etc.)
 */
export class SSRFValidationError extends ScrapingError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, {
      code: "SSRF_VALIDATION_FAILED",
      statusCode: 400,
      isRetryable: false,
      context,
    });
    this.name = "SSRFValidationError";
  }
}

/**
 * Thrown when a fetch or crawl operation exceeds the allocated timeout window.
 */
export class ScrapingTimeoutError extends ScrapingError {
  constructor(timeoutMs: number, targetUrl: string) {
    super(`Scrape operation timed out after ${timeoutMs}ms for ${targetUrl}`, {
      code: "SCRAPING_TIMEOUT",
      statusCode: 504,
      isRetryable: true,
      context: { timeoutMs, targetUrl },
    });
    this.name = "ScrapingTimeoutError";
  }
}

/**
 * Thrown when the target site or scraper service returns HTTP 429 Too Many Requests.
 */
export class ScrapingRateLimitError extends ScrapingError {
  public readonly retryAfterSeconds?: number;

  constructor(targetUrl: string, retryAfterSeconds?: number) {
    super(`Rate limit exceeded while accessing ${targetUrl}`, {
      code: "RATE_LIMIT_EXCEEDED",
      statusCode: 429,
      isRetryable: true,
      context: { targetUrl, retryAfterSeconds },
    });
    this.name = "ScrapingRateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/**
 * Thrown when the connection to the scraping provider fails (DNS, socket, connection refused).
 */
export class ScrapingConnectionError extends ScrapingError {
  constructor(message: string, context?: Record<string, unknown>, cause?: unknown) {
    super(message, {
      code: "PROVIDER_CONNECTION_FAILED",
      statusCode: 503,
      isRetryable: true,
      context,
      cause,
    });
    this.name = "ScrapingConnectionError";
  }
}

/**
 * Thrown when a downloaded payload exceeds the configured maximum response size limit.
 */
export class ContentSizeExceededError extends ScrapingError {
  constructor(receivedBytes: number, maxBytes: number, targetUrl: string) {
    super(
      `Response size (${receivedBytes} bytes) exceeded maximum allowed limit (${maxBytes} bytes) for ${targetUrl}`,
      {
        code: "CONTENT_SIZE_EXCEEDED",
        statusCode: 413,
        isRetryable: false,
        context: { receivedBytes, maxBytes, targetUrl },
      }
    );
    this.name = "ContentSizeExceededError";
  }
}

/**
 * Thrown when redirect count exceeds maximum allowed hops or redirects to prohibited target.
 */
export class RedirectLimitExceededError extends ScrapingError {
  constructor(redirectCount: number, maxRedirects: number, targetUrl: string) {
    super(
      `Redirect limit exceeded (${redirectCount}/${maxRedirects} hops) for ${targetUrl}`,
      {
        code: "REDIRECT_LIMIT_EXCEEDED",
        statusCode: 310,
        isRetryable: false,
        context: { redirectCount, maxRedirects, targetUrl },
      }
    );
    this.name = "RedirectLimitExceededError";
  }
}
