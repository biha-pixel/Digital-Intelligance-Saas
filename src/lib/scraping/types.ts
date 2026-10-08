import { SourceType } from "@/types/database.types";

/**
 * Structured page metadata extracted during the scraping process.
 */
export interface PageMetadata {
  title?: string;
  description?: string;
  language?: string;
  statusCode: number;
  responseTimeMs: number;
  redirectChain?: string[];
  contentLength?: number;
  contentType?: string;
  [key: string]: unknown;
}

/**
 * Options for a single URL scrape request.
 */
export interface ScrapeRequest {
  /** The target URL to fetch */
  url: string;
  /** Optional CSS or XPath selector to wait for before returning */
  waitForSelector?: string;
  /** Delay in milliseconds to wait after page load (for JS rendering) */
  delayMs?: number;
  /** Custom request headers (e.g. Accept-Language) */
  headers?: Record<string, string>;
  /** Timeout in milliseconds (defaults to 30000) */
  timeoutMs?: number;
  /** Whether to bypass any upstream or local cache */
  bypassCache?: boolean;
  /** Maximum number of redirects to follow (defaults to 5) */
  maxRedirects?: number;
  /** Maximum response body size in bytes (defaults to 10MB) */
  maxContentSizeBytes?: number;
  /** Maximum retry attempts on transient failures (defaults to 3) */
  maxRetries?: number;
}

/**
 * Normalized result of a completed scrape operation.
 */
export interface ScrapeResponse {
  /** Final resolved URL (after following safe redirects) */
  url: string;
  /** Original requested source URL before any redirects */
  sourceUrl: string;
  /** HTTP response status code */
  statusCode: number;
  /** Clean, sanitized HTML representation */
  html: string;
  /** Extracted plain text content */
  text: string;
  /** Markdown representation of the page content */
  markdown?: string;
  /** Deterministic SHA-256 hash of the content for deduplication */
  contentHash: string;
  /** UTC ISO-8601 timestamp of when the crawl occurred */
  fetchedAt: string;
  /** Total round-trip execution time in milliseconds */
  executionTimeMs: number;
  /** Structured metadata captured from the target document */
  metadata: PageMetadata;
}

/**
 * Request payload for crawling multiple URLs.
 */
export interface CrawlRequest {
  urls: string[];
  maxConcurrency?: number;
  delayMs?: number;
  timeoutMs?: number;
  bypassCache?: boolean;
  maxRetries?: number;
}

/**
 * Response payload for a batch crawl execution.
 */
export interface CrawlResponse {
  total: number;
  successful: number;
  failed: number;
  results: ScrapeResponse[];
  errors: Array<{ url: string; error: string; code?: string }>;
  totalDurationMs: number;
}

/**
 * Result of a provider health check.
 */
export interface HealthCheckResult {
  healthy: boolean;
  provider: string;
  latencyMs: number;
  message?: string;
  version?: string;
  details?: Record<string, unknown>;
}

/**
 * Vendor-agnostic interface for scraping providers.
 * All scraping providers (Crawl4AI, Puppeteer, HTTP fetcher, etc.) must implement this contract.
 */
export interface ScrapingProvider {
  /** Human-readable provider identifier */
  readonly name: string;

  /**
   * Performs an active health check against the backing scraping service.
   */
  healthCheck(): Promise<HealthCheckResult>;

  /**
   * Fetches and normalizes a single web page.
   */
  fetch(request: ScrapeRequest): Promise<ScrapeResponse>;

  /**
   * Crawls a batch of URLs with bounded concurrency.
   */
  crawl(request: CrawlRequest): Promise<CrawlResponse>;
}

// =============================================================================
// Extractor and Ingestion Data Structures
// =============================================================================

export interface RawExtractedItem {
  externalId?: string;
  authorRawName?: string;
  authorProfileUrl?: string;
  contentText: string;
  rating?: number;
  postedAt?: string;
  title?: string;
  languageCode?: string;
  feedbackType?: "review" | "comment" | "complaint" | "forum_post" | "cx_article";
  rawPayload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface ExtractedFeedback {
  externalId?: string;
  authorDisplayName?: string;
  authorIdentifier: string; // Deterministic SHA-256 pseudonym (Zero-PII)
  postedAt?: string;
  contentText: string;
  rating?: number;
  languageCode: string;
  sourceType: SourceType;
  feedbackType?: "review" | "comment" | "complaint" | "forum_post" | "cx_article";
  wordCount: number;
  contentHash: string; // Deterministic SHA-256 for deduplication
  rawPayload?: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface ExtractionResult {
  sourceType: SourceType;
  items: ExtractedFeedback[];
  pageTitle?: string;
  pageMetadata?: Record<string, unknown>;
  totalExtracted: number;
}
