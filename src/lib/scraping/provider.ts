import { ScrapingProvider } from "./types";
import { Crawl4AIProvider } from "./crawl4ai-client";

export interface ScrapingProviderOptions {
  providerType?: "crawl4ai" | "mock";
  baseUrl?: string;
  apiToken?: string;
}

let defaultProviderInstance: ScrapingProvider | null = null;

/**
 * Provider Factory: returns an implementation of ScrapingProvider.
 *
 * Enforces strict architectural decoupling:
 * Application Layer → ScrapingProvider (Interface) → Crawl4AIProvider → Crawl4AI Engine
 *
 * This ensures the application layer never couples directly to Crawl4AI-specific APIs.
 */
export function getScrapingProvider(
  options?: ScrapingProviderOptions
): ScrapingProvider {
  if (options?.providerType === "crawl4ai" || !options?.providerType) {
    if (options?.baseUrl || options?.apiToken) {
      return new Crawl4AIProvider({
        baseUrl: options.baseUrl,
        apiToken: options.apiToken,
      });
    }

    // Default singleton instance
    if (!defaultProviderInstance) {
      defaultProviderInstance = new Crawl4AIProvider();
    }
    return defaultProviderInstance;
  }

  // Fallback default
  return new Crawl4AIProvider();
}

/**
 * Resets the cached provider instance (useful for test isolation).
 */
export function resetScrapingProvider(): void {
  defaultProviderInstance = null;
}
