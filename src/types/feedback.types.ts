import { SourceType } from "./database.types";

/**
 * NormalizedFeedbackItem represents the canonical model for all ingested
 * feedback (reviews, comments, complaints, etc.)
 */

export type FeedbackClassification =
  | "review"
  | "comment"
  | "complaint"
  | "forum_post"
  | "cx_article";

export type SentimentLabel =
  | 'very_positive'
  | 'positive'
  | 'neutral'
  | 'negative'
  | 'very_negative';

export type IntentLabel =
  | 'complaint'
  | 'praise'
  | 'feature_request'
  | 'bug_report'
  | 'question'
  | 'general_feedback';

export type LanguageQuality =
  | 'high'
  | 'medium'
  | 'low'
  | 'machine_translated';

export interface NormalizedFeedbackItem {
  // Ingestion & Provenance
  id?: string; // Database ID (generated on insert)
  organization_id: string; // Tenant isolation
  source_id: string; // Reference to 'sources' table
  raw_scrape_id?: string; // Reference to 'raw_scrapes' table
  external_id?: string; // Platform-specific unique ID
  source_type: SourceType; // Trustpilot, Yelp, etc.
  feedback_type?: FeedbackClassification;

  // Content
  content_text: string;
  rating?: number; // 1-5 scale
  author_display_name?: string; // Optional, if allowed by platform
  author_identifier: string; // Deterministic SHA-256 (Zero-PII)
  posted_at?: string; // ISO-8601 string

  // Metadata
  language_code: string;
  word_count: number;
  content_hash: string; // SHA-256 for deduplication

  // Analysis & AI (populated asynchronously)
  sentiment_label?: SentimentLabel;
  sentiment_score?: number;
  topics?: string[];
  intent?: IntentLabel;
  key_entities?: string[];
  language_quality?: LanguageQuality;

  // Audit
  ingestion_run_id?: string;
  raw_payload?: Record<string, unknown>; // JSONB for platform-specific raw data
  created_at?: string;
  updated_at?: string;
}
