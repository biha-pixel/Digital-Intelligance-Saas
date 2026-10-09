import { SearchProvider, SearchQuery, SearchResult } from "../types";

export class MockSearchProvider implements SearchProvider {
  name = "mock_search_provider";
  private customResults: Record<string, SearchResult[]> = {};
  private defaultResults: SearchResult[] = [];

  constructor(customResults?: Record<string, SearchResult[]>) {
    if (customResults) {
      this.customResults = customResults;
    }
  }

  // Pre-seed search results for testing
  setMockResults(queryTermOrResults: string | SearchResult[], results?: SearchResult[]) {
    if (Array.isArray(queryTermOrResults)) {
      this.defaultResults = queryTermOrResults;
    } else if (results) {
      this.customResults[queryTermOrResults.toLowerCase()] = results;
    }
  }

  async search(query: SearchQuery): Promise<SearchResult[]> {
    const key = query.term.toLowerCase();

    // Extract brand name from query if wrapped in quotes, or default to Notion
    const quotedMatches = query.term.match(/"([^"]+)"/g)?.map(m => m.replace(/"/g, "")) || [];
    const brand = quotedMatches[0] || "Notion";
    // Get domain if exists, usually it contains a dot
    const domain = quotedMatches.find((m: string) => m.includes(".")) || `${brand.toLowerCase().replace(/\s+/g, "")}.so`;

    // Check if we have exact mocked results
    if (this.customResults[key]) {
      return this.customResults[key];
    }

    // Check if default mock results are provided
    if (this.defaultResults.length > 0) {
      return this.defaultResults;
    }

    // Otherwise, generate realistic fallback results based on common patterns
    if (key.includes("trustpilot")) {
      return [
        {
          url: `https://www.trustpilot.com/review/${domain}?utm_source=search`,
          title: `Reviews of ${brand} | Trustpilot`,
          snippet: `Check out what 1,234 people have written about ${brand}.`,
          relevanceScore: 0.95,
        },
      ];
    }

    if (key.includes("g2")) {
      return [
        {
          url: `https://www.g2.com/products/${brand.toLowerCase().replace(/\s+/g, "-")}/reviews`,
          title: `${brand} Reviews 2026: Details, Pricing, & Features | G2`,
          snippet: `${brand} is rated 4.5 out of 5 stars based on 89 reviews.`,
          relevanceScore: 0.88,
        },
      ];
    }

    if (key.includes("capterra")) {
      return [
        {
          url: `https://www.capterra.com/p/12345/${brand.toLowerCase().replace(/\s+/g, "-")}/reviews`,
          title: `${brand} Reviews 2026 | Capterra`,
          snippet: `Read real user reviews of ${brand}. See what others think about ${brand}.`,
          relevanceScore: 0.82,
        },
      ];
    }

    if (key.includes("reddit")) {
      return [
        {
          url: `https://www.reddit.com/r/SaaS/comments/xyz/is_${brand.toLowerCase().replace(/\s+/g, "_")}_worth_it/`,
          title: `Is ${brand} worth the price? : r/SaaS - Reddit`,
          snippet: `I've been using ${brand} for 3 months now. Here are my thoughts...`,
          relevanceScore: 0.75,
        },
      ];
    }

    if (key.includes("google maps")) {
      return [
        {
          url: "https://maps.google.com/?cid=1234567890",
          title: `${brand} Headquarters - Google Maps`,
          snippet: `123 Market St, San Francisco, CA. Rated 4.8 stars.`,
          relevanceScore: 0.9,
        },
      ];
    }

    if (key.includes("app_store")) {
      return [
        {
          url: `https://apps.apple.com/us/app/${brand.toLowerCase().replace(/\s+/g, "-")}/id123456789`,
          title: `${brand} on the App Store`,
          snippet: `Download ${brand} and enjoy it on your iPhone, iPad, and iPod touch.`,
          relevanceScore: 0.85,
        },
      ];
    }

    if (key.includes("play_store")) {
      return [
        {
          url: `https://play.google.com/store/apps/details?id=com.${brand.toLowerCase().replace(/\s+/g, "")}.app`,
          title: `${brand} - Apps on Google Play`,
          snippet: `Get things done with ${brand}. Organize your work and life.`,
          relevanceScore: 0.85,
        },
      ];
    }

    return [
      {
        url: `https://${domain}`,
        title: `${brand} - Official Website`,
        snippet: `Welcome to ${brand}. We build the future.`,
        relevanceScore: 0.99,
      },
    ];
  }
}
