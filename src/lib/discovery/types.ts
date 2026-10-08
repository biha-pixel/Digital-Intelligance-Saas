import { z } from "zod";
import { type Database } from "@/types/database.types";

export type SourceType = Database["public"]["Enums"]["source_type"];

export interface CandidateSource {
  url: string;
  normalizedUrl: string;
  title: string;
  sourceType: SourceType;
  discoveredQuery: string;
  relevanceScore: number; // 0.0 - 1.0 (from search provider)
  confidence: number;     // 0.0 - 1.0 (calculated by us)
  reason: string;         // Explanation for the confidence score
  verificationStatus: "unverified" | "verified_auto" | "rejected";
}

export interface SearchQuery {
  term: string;
  platform?: SourceType;
  limit?: number;
}

export interface SearchResult {
  url: string;
  title: string;
  snippet: string;
  relevanceScore?: number; // Some APIs provide a score
}

// Abstraction for any search engine API (Tavily, Serper, Bing, etc.)
export interface SearchProvider {
  name: string;
  search(query: SearchQuery): Promise<SearchResult[]>;
}

// Model for a full discovery run's output
export interface DiscoveryRunResult {
  companyProfileId: string;
  candidates: CandidateSource[];
  metrics: {
    totalSearches: number;
    totalCandidates: number;
    deduplicatedCount: number;
  };
}
