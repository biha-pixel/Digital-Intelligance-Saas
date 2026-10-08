import { AIProvider } from "./types";
import { OmniRouteAdapter } from "./adapters/omniroute-adapter";
import { MockAIProvider } from "./adapters/mock-adapter";

export interface ProviderFactoryOptions {
  provider?: "omniroute" | "mock" | string;
  apiKey?: string;
  baseUrl?: string;
}

let defaultProviderInstance: AIProvider | null = null;

/**
 * AI Provider Factory.
 * Instantiates and returns the configured AI Provider interface instance.
 * Decouples the rest of the application from specific gateway clients.
 */
export function getAIProvider(options: ProviderFactoryOptions | string = {}): AIProvider {
  if (defaultProviderInstance) {
    return defaultProviderInstance;
  }

  const opts: ProviderFactoryOptions = typeof options === "string" ? { provider: options } : options;

  const providerType =
    opts.provider ||
    process.env.AI_PROVIDER ||
    (process.env.NODE_ENV === "test" && !process.env.OMNIROUTE_API_KEY ? "mock" : "omniroute");

  if (providerType === "mock") {
    return new MockAIProvider();
  }

  return new OmniRouteAdapter({
    apiKey: opts.apiKey,
    baseUrl: opts.baseUrl,
  });
}

/**
 * Returns a shared default singleton instance of the AIProvider.
 */
export function getDefaultAIProvider(): AIProvider {
  if (!defaultProviderInstance) {
    defaultProviderInstance = getAIProvider();
  }
  return defaultProviderInstance;
}

/**
 * Sets the default singleton provider instance (useful in tests/custom configurations).
 */
export function setDefaultAIProvider(provider: AIProvider): void {
  defaultProviderInstance = provider;
}

/**
 * Resets the default singleton provider instance (useful in tests).
 */
export function resetDefaultAIProvider(): void {
  defaultProviderInstance = null;
}
