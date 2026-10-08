import { SearchProvider, SearchQuery, SearchResult } from "../types";

export class MockSearchProvider implements SearchProvider {
  name = "mock_search_provider";
  private customResults: Record<string, SearchResult[]> = {};

  constructor(customResults?: Record<string, SearchResult[]>) {
    if (customResults) {
      this.customResults = customResults;
    }
  }

  // Pre-seed search results for testing
  setMockResults(queryTerm: string, results: SearchResult[]) {
    this.customResults[queryTerm.toLowerCase()] = results;
  }

  async search(query: SearchQuery): Promise<SearchResult[]> {
    const key = query.term.toLowerCase();

    // Check if we have exact mocked results
    if (this.customResults[key]) {
      return this.customResults[key];
    }

    // Otherwise, generate realistic fallback results based on common patterns
    if (key.includes("trustpilot")) {
      return [
        {
          url: "https://www.trustpilot.com/review/example.com?utm_source=search",
          title: "Reviews of Example Company | Trustpilot",
          snippet: "Check out what 1,234 people have written about Example Company.",
          relevanceScore: 0.95,
        },
      ];
    }

    if (key.includes("g2")) {
      return [
        {
          url: "https://www.g2.com/products/example-software/reviews",
          title: "Example Software Reviews 2026: Details, Pricing, & Features | G2",
          snippet: "Example Software is rated 4.5 out of 5 stars based on 89 reviews.",
          relevanceScore: 0.88,
        },
      ];
    }

    if (key.includes("reddit")) {
      return [
        {
          url: "https://www.reddit.com/r/SaaS/comments/xyz/is_example_worth_it/",
          title: "Is Example Software worth the price? : r/SaaS - Reddit",
          snippet: "I've been using Example for 3 months now. Here are my thoughts...",
          relevanceScore: 0.75,
        },
      ];
    }

    if (key.includes("google maps")) {
      return [
        {
          url: "https://maps.google.com/?cid=1234567890",
          title: "Example Headquarters - Google Maps",
          snippet: "123 Market St, San Francisco, CA. Rated 4.8 stars.",
          relevanceScore: 0.9,
        },
      ];
    }

    return [
      {
        url: "https://example.com",
        title: "Example Company - Official Website",
        snippet: "Welcome to Example Company. We build the future.",
        relevanceScore: 0.99,
      },
    ];
  }
}
