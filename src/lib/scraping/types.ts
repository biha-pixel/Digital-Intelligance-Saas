import { SourceType } from "@/types/database.types";

export interface ScrapeRequest {
  url: string;
  waitForSelector?: string;
  delayMs?: number;
  headers?: Record<string, string>;
  timeoutMs?: number;
  bypassCache?: boolean;
}

export interface ScrapeResponse {
  url: string;
  statusCode: number;
  html: string;
  text: string;
  markdown?: string;
  contentHash: string;
  fetchedAt: string;
  executionTimeMs: number;
  metadata?: Record<string, unknown>;
}

export interface RawExtractedItem {
  authorRawName?: string;
  authorProfileUrl?: string;
  contentText: string;
  rating?: number;
  postedAt?: string;
  title?: string;
  languageCode?: string;
  metadata?: Record<string, unknown>;
}

export interface ExtractedFeedback {
  authorIdentifier: string; // Deterministic SHA-256 pseudonym (Zero-PII)
  postedAt?: string;
  contentText: string;
  rating?: number;
  languageCode: string;
  sourceType: SourceType;
  wordCount: number;
  contentHash: string; // Deterministic SHA-256 for deduplication
  metadata: Record<string, unknown>;
}

export interface ExtractionResult {
  sourceType: SourceType;
  items: ExtractedFeedback[];
  pageTitle?: string;
  pageMetadata?: Record<string, unknown>;
  totalExtracted: number;
}

export interface ScrapingProvider {
  readonly name: string;
  healthCheck(): Promise<boolean>;
  fetch(request: ScrapeRequest): Promise<ScrapeResponse>;
}
