import { SearchProvider, SearchQuery, SearchResult } from "../types";

export class SerperSearchProvider implements SearchProvider {
  name = "serper_google_search";
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.SERPER_API_KEY || "";
  }

  async search(query: SearchQuery): Promise<SearchResult[]> {
    if (!this.apiKey) {
      console.warn("SERPER_API_KEY is not configured. Returning empty search results.");
      return [];
    }

    try {
      const response = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "X-API-KEY": this.apiKey,
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

      return results;
    } catch (error) {
      console.error("Failed to execute search via Serper:", error);
      return [];
    }
  }
}
