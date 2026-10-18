import {
  ScrapingProvider,
  ScrapeRequest,
  ScrapeResponse,
  CrawlRequest,
  CrawlResponse,
  HealthCheckResult,
} from "./types";
import { Crawl4AIProvider } from "./crawl4ai-client";
import { MockScrapingProvider } from "./mock-provider";

export interface ScrapingProviderOptions {
  providerType?: "crawl4ai" | "mock" | "resilient";
  baseUrl?: string;
  apiToken?: string;
}

let crawl4aiInstance: ScrapingProvider | null = null;
let mockProviderInstance: ScrapingProvider | null = null;
let resilientInstance: ScrapingProvider | null = null;

/**
 * Resilient Provider Wrapper:
 * Attempts Crawl4AI first, and falls back seamlessly to MockScrapingProvider
 * if Crawl4AI is unavailable, times out, or returns blocked/empty HTML (e.g. Cloudflare).
 */
class ResilientScrapingProvider implements ScrapingProvider {
  public readonly name = "resilient_crawler";
  private crawl4ai: Crawl4AIProvider;
  private mock: MockScrapingProvider;

  constructor(options?: ScrapingProviderOptions) {
    this.crawl4ai = new Crawl4AIProvider({
      baseUrl: options?.baseUrl,
      apiToken: options?.apiToken,
    });
    this.mock = new MockScrapingProvider();
  }

  public async healthCheck(): Promise<HealthCheckResult> {
    const health = await this.crawl4ai.healthCheck();
    if (health.healthy) {
      return health;
    }
    return this.mock.healthCheck();
  }

  public async fetch(request: ScrapeRequest): Promise<ScrapeResponse> {
    try {
      // Execute Crawl4AI with a protective timeout
      const result = await Promise.race([
        this.crawl4ai.fetch(request),
        new Promise<ScrapeResponse>((_, reject) =>
          setTimeout(() => reject(new Error("Crawl4AI timeout")), 25000)
        ),
      ]);

      if (result.html && result.html.length > 500) {
        // Verify we didn't just get a Cloudflare challenge page
        const lower = result.html.toLowerCase();
        if (!lower.includes("cf-browser-verification") && !lower.includes("just a moment...")) {
          return result;
        }
      }

      console.warn(
        `[Scraper] Crawl4AI returned empty or challenge HTML for ${request.url}. Falling back to mock provider.`
      );
    } catch (err: any) {
      console.warn(
        `[Scraper] Crawl4AI fetch failed (${err.message}). Falling back to mock provider for demo pipeline.`
      );
    }

    return this.mock.fetch(request);
  }

  public async crawl(request: CrawlRequest): Promise<CrawlResponse> {
    const results: ScrapeResponse[] = [];
    for (const url of request.urls) {
      const res = await this.fetch({ url });
      results.push(res);
    }

    return {
      total: request.urls.length,
      successful: results.length,
      failed: 0,
      results,
      errors: [],
      totalDurationMs: 0,
    };
  }
}

/**
 * Provider Factory: returns an implementation of ScrapingProvider.
 *
 * Enforces strict architectural decoupling:
 * Application Layer → ScrapingProvider (Interface) → Crawl4AI / ResilientProvider
 */
export function getScrapingProvider(
  options?: ScrapingProviderOptions
): ScrapingProvider {
  const providerType =
    options?.providerType ||
    process.env.SCRAPING_PROVIDER ||
    (process.env.NODE_ENV === "test" ? "mock" : "crawl4ai");

  if (providerType === "mock") {
    if (!mockProviderInstance) {
      mockProviderInstance = new MockScrapingProvider();
    }
    return mockProviderInstance;
  }

  if (providerType === "resilient") {
    if (!resilientInstance) {
      resilientInstance = new ResilientScrapingProvider(options);
    }
    return resilientInstance;
  }

  // Active default is strict Crawl4AI provider — fail fast on container errors
  if (!crawl4aiInstance) {
    crawl4aiInstance = new Crawl4AIProvider({
      baseUrl: options?.baseUrl,
      apiToken: options?.apiToken,
    });
  }
  return crawl4aiInstance;
}

/**
 * Resets the cached provider instance (useful for test isolation).
 */
export function resetScrapingProvider(): void {
  crawl4aiInstance = null;
  resilientInstance = null;
  mockProviderInstance = null;
}
