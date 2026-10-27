import { SearchProvider, SearchQuery, SearchResult } from "../types";

/**
 * Multi-Account Serper Search Provider
 *
 * Rotates between multiple Serper API keys stored in environment variables.
 * This implements load balancing across your 2+ Serper free-tier accounts.
 *
 * Configuration in .env.local:
 * SERPER_API_KEYS=sk-serper-key1,sk-serper-key2,sk-serper-key3
 *
 * Each search request cycles through the keys automatically.
 */
export class MultiAccountSerperProvider implements SearchProvider {
  name = "multi_account_serper";
  private apiKeys: string[];
  private currentKeyIndex: number = 0;

  constructor(apiKeys?: string[]) {
    if (apiKeys && apiKeys.length > 0) {
      this.apiKeys = apiKeys;
    } else {
      // Load from environment: comma-separated API keys
      const keysFromEnv = process.env.SERPER_API_KEYS || "";
      this.apiKeys = keysFromEnv
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k.length > 0);
    }

    if (this.apiKeys.length === 0) {
      console.warn(
        "No Serper API keys configured. Set SERPER_API_KEYS=key1,key2,key3 in .env.local"
      );
    }
  }

  /**
   * Get next API key in rotation (round-robin load balancing)
   */
  private getNextKey(): string {
    if (this.apiKeys.length === 0) {
      throw new Error("No Serper API keys configured");
    }

    const key = this.apiKeys[this.currentKeyIndex];
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;

    return key;
  }

  /**
   * Execute search via Serper API with automatic key rotation
   */
  async search(query: SearchQuery): Promise<SearchResult[]> {
    const apiKey = this.getNextKey();
    const accountIndex = this.currentKeyIndex; // Show which account was used

    try {
      const response = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "X-API-KEY": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q: query.term,
          num: query.limit || 5,
        }),
      });

      if (!response.ok) {
        throw new Error(`Serper API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const results: SearchResult[] = [];

      if (data.organic && Array.isArray(data.organic)) {
        for (const item of data.organic) {
          results.push({
            url: item.link,
            title: item.title,
            snippet: item.snippet || "",
            relevanceScore: item.position ? Math.max(0.1, 1 - (item.position - 1) * 0.1) : 0.8,
          });
        }
      }

      console.log(
        `[Serper] Used account ${accountIndex} | Query: "${query.term}" | Results: ${results.length}`
      );

      return results;
    } catch (error) {
      console.error(
        `[Serper Account ${accountIndex}] Search failed for "${query.term}":`,
        error instanceof Error ? error.message : error
      );

      // Try next account on failure
      if (this.apiKeys.length > 1) {
        console.log("[Serper] Retrying with next account...");
        return this.search(query);
      }

      return [];
    }
  }

  /**
   * Get current configuration info
   */
  getInfo() {
    return {
      name: this.name,
      accountsConfigured: this.apiKeys.length,
      currentIndex: this.currentKeyIndex,
    };
  }
}
