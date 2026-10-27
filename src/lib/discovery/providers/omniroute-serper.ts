import { SearchProvider, SearchQuery, SearchResult } from "../types";

/**
 * OmniRoute Serper Search Provider
 *
 * Routes search requests through OmniRoute's Serper integration,
 * which automatically load-balances across multiple Serper API connections.
 *
 * Architecture:
 * CXPulse Discovery → OmniRouteSerperProvider → OmniRoute (localhost:20128)
 *                      → Serper Connection 1 (Account 1)
 *                      → Serper Connection 2 (Account 2)
 *
 * OmniRoute automatically rotates between connections based on availability.
 */
export class OmniRouteSerperProvider implements SearchProvider {
  name = "omniroute_serper_search";
  private baseUrl: string;
  private apiKey: string;

  constructor(options?: { baseUrl?: string; apiKey?: string }) {
    this.baseUrl = (
      options?.baseUrl ||
      process.env.OMNIROUTE_BASE_URL ||
      "http://localhost:20128"
    ).replace(/\/+$/, ""); // Trim trailing slashes

    this.apiKey = options?.apiKey || process.env.OMNIROUTE_API_KEY || "";
  }

  /**
   * Executes a search query through OmniRoute's Serper integration
   */
  async search(query: SearchQuery): Promise<SearchResult[]> {
    if (!this.apiKey) {
      console.warn(
        "OMNIROUTE_API_KEY is not configured. Cannot reach OmniRoute Serper integration."
      );
      return [];
    }

    try {
      const limit = query.limit || 5;
      const searchTerm = query.term;

      // Request payload for OmniRoute Serper endpoint
      const payload = {
        query: searchTerm,
        num_results: limit,
        // Optional: specify connection if OmniRoute supports it
        // connection: "Serper Account 1", // Falls back to round-robin if omitted
      };

      const response = await fetch(`${this.baseUrl}/api/providers/serper/search`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        console.error(
          `OmniRoute Serper API error: ${response.status} ${response.statusText}`,
          errorText
        );

        // Fallback to empty results on error (caller will handle gracefully)
        if (response.status === 401 || response.status === 403) {
          console.error("OmniRoute authentication failed. Check OMNIROUTE_API_KEY.");
        }

        return [];
      }

      const data = await response.json();

      // Normalize OmniRoute response to SearchResult format
      const results: SearchResult[] = [];

      if (data.results && Array.isArray(data.results)) {
        for (let index = 0; index < data.results.length; index++) {
          const item = data.results[index];

          // Extract fields from OmniRoute's Serper response
          results.push({
            url: item.url || item.link,
            title: item.title,
            snippet: item.snippet || item.description || "",
            // Calculate relevance score based on position (higher = more relevant)
            relevanceScore: Math.max(0.1, 1 - (index) * 0.1),
          });
        }
      }

      if (results.length === 0) {
        console.warn(`OmniRoute Serper returned no results for query: "${searchTerm}"`);
      }

      return results;
    } catch (error) {
      console.error(
        "OmniRoute Serper search failed:",
        error instanceof Error ? error.message : error
      );
      return [];
    }
  }
}
