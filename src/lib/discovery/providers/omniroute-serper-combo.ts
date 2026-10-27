import { SearchProvider, SearchQuery, SearchResult } from "../types";

/**
 * OmniRoute Serper Combo Provider
 *
 * Uses OmniRoute's combo system to automatically load-balance across multiple Serper accounts.
 * Just like AI models (gemini3.1), you create a combo in OmniRoute dashboard and pass the combo name.
 *
 * Setup:
 * 1. Create a Serper combo in OmniRoute dashboard (e.g., "serper-combo")
 * 2. Add your Serper connections to the combo
 * 3. Set OMNIROUTE_SERPER_COMBO=serper-combo in .env.local
 * 4. OmniRoute automatically rotates between your accounts
 *
 * This is simpler than MultiAccountSerperProvider because OmniRoute handles:
 * - Load balancing
 * - Failover
 * - Rate limit tracking
 * - Usage monitoring
 */
export class OmniRouteSerperComboProvider implements SearchProvider {
  name = "omniroute_serper_combo";
  private baseUrl: string;
  private apiKey: string;
  private comboName: string;

  constructor(options?: { baseUrl?: string; apiKey?: string; comboName?: string }) {
    this.baseUrl = (
      options?.baseUrl ||
      process.env.OMNIROUTE_BASE_URL ||
      "http://localhost:20128"
    ).replace(/\/+$/, ""); // Trim trailing slashes

    this.apiKey = options?.apiKey || process.env.OMNIROUTE_API_KEY || "";

    // Combo name from options or environment (e.g., "serper-combo")
    this.comboName = options?.comboName || process.env.OMNIROUTE_SERPER_COMBO || "";
  }

  /**
   * Executes a search query through OmniRoute's Serper combo
   */
  async search(query: SearchQuery): Promise<SearchResult[]> {
    if (!this.apiKey) {
      console.warn(
        "OMNIROUTE_API_KEY is not configured. Cannot reach OmniRoute."
      );
      return [];
    }

    if (!this.comboName) {
      console.warn(
        "OMNIROUTE_SERPER_COMBO is not configured. Set the combo name in .env.local"
      );
      return [];
    }

    try {
      const limit = query.limit || 5;
      const searchTerm = query.term;

      // Payload for OmniRoute Serper endpoint
      // OmniRoute will automatically route to the next available account in the combo
      const payload = {
        q: searchTerm,
        num: limit,
        // Optional: you can pass combo name if OmniRoute supports it in request body
        // For now we'll use the configured default combo
      };

      // Make request to OmniRoute's Serper endpoint
      // OmniRoute will handle routing to your combo connections automatically
      const response = await fetch(`${this.baseUrl}/api/search/serper`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          // Pass combo name in header (check OmniRoute docs for exact header name)
          "X-Combo": this.comboName,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        console.error(
          `OmniRoute Serper combo error: ${response.status} ${response.statusText}`,
          errorText
        );

        if (response.status === 401 || response.status === 403) {
          console.error("OmniRoute authentication failed. Check OMNIROUTE_API_KEY.");
        } else if (response.status === 404) {
          console.error(
            `Combo "${this.comboName}" not found in OmniRoute. Create it in the dashboard first.`
          );
        }

        return [];
      }

      const data = await response.json();

      // Normalize OmniRoute response to SearchResult format
      const results: SearchResult[] = [];

      // OmniRoute might return Serper's native format under "organic" or wrap it differently
      const items = data.organic || data.results || [];

      if (Array.isArray(items)) {
        for (let index = 0; index < items.length; index++) {
          const item = items[index];

          results.push({
            url: item.link || item.url,
            title: item.title,
            snippet: item.snippet || item.description || "",
            // Calculate relevance score based on position (higher = more relevant)
            relevanceScore: item.position
              ? Math.max(0.1, 1 - (item.position - 1) * 0.1)
              : Math.max(0.1, 1 - index * 0.1),
          });
        }
      }

      if (results.length === 0) {
        console.warn(`OmniRoute Serper combo returned no results for: "${searchTerm}"`);
      } else {
        console.log(
          `[OmniRoute Serper Combo: ${this.comboName}] Query: "${searchTerm}" | Results: ${results.length}`
        );
      }

      return results;
    } catch (error) {
      console.error(
        "OmniRoute Serper combo search failed:",
        error instanceof Error ? error.message : error
      );
      return [];
    }
  }

  /**
   * Get current configuration info
   */
  getInfo() {
    return {
      name: this.name,
      comboName: this.comboName,
      baseUrl: this.baseUrl,
      configured: !!(this.apiKey && this.comboName),
    };
  }
}
