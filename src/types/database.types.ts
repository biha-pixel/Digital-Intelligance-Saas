/**
 * CXPulse SaaS Database Type Definitions
 * Generated and aligned with:
 * - 20261007000000_core_foundation_schema.sql
 * - 20261007000001_phase3_core_schema.sql
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "owner" | "admin" | "analyst" | "viewer";
export type PlanTier = "free" | "starter" | "growth" | "enterprise";
export type SourceType =
  | "google_maps"
  | "trustpilot"
  | "yelp"
  | "g2"
  | "capterra"
  | "app_store"
  | "play_store"
  | "reddit"
  | "generic_web";
export type SourceStatus =
  | "discovered"
  | "pending_verification"
  | "active"
  | "failed"
  | "paused"
  | "archived";
export type SourceOwnership = "owned" | "competitor" | "unclaimed";
export type VerificationStatus =
  | "unverified"
  | "verified_auto"
  | "verified_manual"
  | "rejected";
export type MonitoringStatus = "active" | "paused" | "failing" | "disabled";
export type IngestionStatus =
  | "queued"
  | "fetching"
  | "extracting"
  | "completed"
  | "failed"
  | "unchanged";
export type JobStatus =
  | "QUEUED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "FAILED"
  | "DEAD_LETTER";
export type SentimentEnum =
  | "very_positive"
  | "positive"
  | "neutral"
  | "negative"
  | "very_negative";
export type IntentEnum =
  | "complaint"
  | "praise"
  | "feature_request"
  | "bug_report"
  | "question"
  | "general_feedback";
export type LanguageQualityEnum =
  | "high"
  | "medium"
  | "low"
  | "machine_translated";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          plan: PlanTier;
          status: string;
          owner_user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          plan?: PlanTier;
          status?: string;
          owner_user_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          plan?: PlanTier;
          status?: string;
          owner_user_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      organization_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: UserRole;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role?: UserRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          role?: UserRole;
          created_at?: string;
        };
      };
      company_profiles: {
        Row: {
          id: string;
          organization_id: string;
          company_name: string;
          display_name: string | null;
          primary_domain: string | null;
          country: string | null;
          locations: Json;
          industry: string | null;
          aliases: Json;
          social_handles: Json;
          completeness_score: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          company_name: string;
          display_name?: string | null;
          primary_domain?: string | null;
          country?: string | null;
          locations?: Json;
          industry?: string | null;
          aliases?: Json;
          social_handles?: Json;
          completeness_score?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          company_name?: string;
          display_name?: string | null;
          primary_domain?: string | null;
          country?: string | null;
          locations?: Json;
          industry?: string | null;
          aliases?: Json;
          social_handles?: Json;
          completeness_score?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      company_aliases: {
        Row: {
          id: string;
          organization_id: string;
          company_profile_id: string;
          alias_name: string;
          is_primary_brand: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          company_profile_id: string;
          alias_name: string;
          is_primary_brand?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          company_profile_id?: string;
          alias_name?: string;
          is_primary_brand?: boolean;
          created_at?: string;
        };
      };
      company_domains: {
        Row: {
          id: string;
          organization_id: string;
          company_profile_id: string;
          domain: string;
          is_primary: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          company_profile_id: string;
          domain: string;
          is_primary?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          company_profile_id?: string;
          domain?: string;
          is_primary?: boolean;
          created_at?: string;
        };
      };
      company_locations: {
        Row: {
          id: string;
          organization_id: string;
          company_profile_id: string;
          location_name: string;
          address: string | null;
          city: string | null;
          state_region: string | null;
          country: string | null;
          postal_code: string | null;
          latitude: number | null;
          longitude: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          company_profile_id: string;
          location_name: string;
          address?: string | null;
          city?: string | null;
          state_region?: string | null;
          country?: string | null;
          postal_code?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          company_profile_id?: string;
          location_name?: string;
          address?: string | null;
          city?: string | null;
          state_region?: string | null;
          country?: string | null;
          postal_code?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      company_social_accounts: {
        Row: {
          id: string;
          organization_id: string;
          company_profile_id: string;
          platform: string;
          handle: string;
          profile_url: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          company_profile_id: string;
          platform: string;
          handle: string;
          profile_url: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          company_profile_id?: string;
          platform?: string;
          handle?: string;
          profile_url?: string;
          created_at?: string;
        };
      };
      sources: {
        Row: {
          id: string;
          organization_id: string;
          company_profile_id: string;
          url: string;
          source_type: SourceType;
          ownership: SourceOwnership;
          verification_status: VerificationStatus;
          is_active: boolean;
          display_name: string;
          metadata: Json;
          confidence_score: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          company_profile_id: string;
          url: string;
          source_type: SourceType;
          ownership?: SourceOwnership;
          verification_status?: VerificationStatus;
          is_active?: boolean;
          display_name: string;
          metadata?: Json;
          confidence_score?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          company_profile_id?: string;
          url?: string;
          source_type?: SourceType;
          ownership?: SourceOwnership;
          verification_status?: VerificationStatus;
          is_active?: boolean;
          display_name?: string;
          metadata?: Json;
          confidence_score?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      source_discoveries: {
        Row: {
          id: string;
          organization_id: string;
          company_profile_id: string;
          discovered_url: string;
          source_type: SourceType;
          confidence_score: number;
          discovery_method: string;
          status: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          company_profile_id: string;
          discovered_url: string;
          source_type: SourceType;
          confidence_score?: number;
          discovery_method: string;
          status?: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          company_profile_id?: string;
          discovered_url?: string;
          source_type?: SourceType;
          confidence_score?: number;
          discovery_method?: string;
          status?: string;
          metadata?: Json;
          created_at?: string;
        };
      };
      source_verifications: {
        Row: {
          id: string;
          organization_id: string;
          source_id: string;
          status: VerificationStatus;
          verification_method: string;
          verified_by_user_id: string | null;
          notes: string | null;
          verified_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          source_id: string;
          status: VerificationStatus;
          verification_method: string;
          verified_by_user_id?: string | null;
          notes?: string | null;
          verified_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          source_id?: string;
          status?: VerificationStatus;
          verification_method?: string;
          verified_by_user_id?: string | null;
          notes?: string | null;
          verified_at?: string;
        };
      };
      monitoring_targets: {
        Row: {
          id: string;
          organization_id: string;
          source_id: string;
          status: MonitoringStatus;
          polling_interval_seconds: number;
          next_check_at: string;
          last_checked_at: string | null;
          last_content_hash: string | null;
          consecutive_failures: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          source_id: string;
          status?: MonitoringStatus;
          polling_interval_seconds?: number;
          next_check_at?: string;
          last_checked_at?: string | null;
          last_content_hash?: string | null;
          consecutive_failures?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          source_id?: string;
          status?: MonitoringStatus;
          polling_interval_seconds?: number;
          next_check_at?: string;
          last_checked_at?: string | null;
          last_content_hash?: string | null;
          consecutive_failures?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      ingestion_runs: {
        Row: {
          id: string;
          organization_id: string;
          monitoring_target_id: string | null;
          source_id: string;
          status: IngestionStatus;
          fetch_url: string;
          http_status: number | null;
          content_hash: string | null;
          items_extracted: number;
          items_new: number;
          items_duplicate: number;
          error_message: string | null;
          execution_duration_ms: number | null;
          started_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          monitoring_target_id?: string | null;
          source_id: string;
          status?: IngestionStatus;
          fetch_url: string;
          http_status?: number | null;
          content_hash?: string | null;
          items_extracted?: number;
          items_new?: number;
          items_duplicate?: number;
          error_message?: string | null;
          execution_duration_ms?: number | null;
          started_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          monitoring_target_id?: string | null;
          source_id?: string;
          status?: IngestionStatus;
          fetch_url?: string;
          http_status?: number | null;
          content_hash?: string | null;
          items_extracted?: number;
          items_new?: number;
          items_duplicate?: number;
          error_message?: string | null;
          execution_duration_ms?: number | null;
          started_at?: string;
          completed_at?: string | null;
        };
      };
      raw_scrapes: {
        Row: {
          id: string;
          organization_id: string;
          source_id: string;
          source_url: string;
          http_status: number;
          content_hash: string;
          raw_html: string | null;
          raw_text: string | null;
          metadata: Json;
          fetched_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          source_id: string;
          source_url: string;
          http_status: number;
          content_hash: string;
          raw_html?: string | null;
          raw_text?: string | null;
          metadata?: Json;
          fetched_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          source_id?: string;
          source_url?: string;
          http_status?: number;
          content_hash?: string;
          raw_html?: string | null;
          raw_text?: string | null;
          metadata?: Json;
          fetched_at?: string;
        };
      };
      feedback_items: {
        Row: {
          id: string;
          organization_id: string;
          source_id: string;
          raw_scrape_id: string | null;
          author_identifier: string;
          posted_at: string | null;
          content_text: string;
          rating: number | null;
          language_code: string | null;
          source_type: SourceType;
          word_count: number;
          content_hash: string;
          sentiment_label: SentimentEnum | null;
          sentiment_score: number | null;
          topics: Json;
          intent: IntentEnum | null;
          key_entities: Json;
          language_quality: LanguageQualityEnum | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          source_id: string;
          raw_scrape_id?: string | null;
          author_identifier: string;
          posted_at?: string | null;
          content_text: string;
          rating?: number | null;
          language_code?: string | null;
          source_type: SourceType;
          word_count?: number;
          content_hash: string;
          sentiment_label?: SentimentEnum | null;
          sentiment_score?: number | null;
          topics?: Json;
          intent?: IntentEnum | null;
          key_entities?: Json;
          language_quality?: LanguageQualityEnum | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          source_id?: string;
          raw_scrape_id?: string | null;
          author_identifier?: string;
          posted_at?: string | null;
          content_text?: string;
          rating?: number | null;
          language_code?: string | null;
          source_type?: SourceType;
          word_count?: number;
          content_hash?: string;
          sentiment_label?: SentimentEnum | null;
          sentiment_score?: number | null;
          topics?: Json;
          intent?: IntentEnum | null;
          key_entities?: Json;
          language_quality?: LanguageQualityEnum | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      feedback_analyses: {
        Row: {
          id: string;
          organization_id: string;
          feedback_item_id: string;
          model_name: string;
          prompt_tokens: number;
          completion_tokens: number;
          cost_usd: number;
          sentiment_breakdown: Json;
          extracted_topics: Json;
          customer_pain_points: Json;
          churn_risk_score: number | null;
          suggested_action: string | null;
          raw_response: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          feedback_item_id: string;
          model_name: string;
          prompt_tokens?: number;
          completion_tokens?: number;
          cost_usd?: number;
          sentiment_breakdown?: Json;
          extracted_topics?: Json;
          customer_pain_points?: Json;
          churn_risk_score?: number | null;
          suggested_action?: string | null;
          raw_response?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          feedback_item_id?: string;
          model_name?: string;
          prompt_tokens?: number;
          completion_tokens?: number;
          cost_usd?: number;
          sentiment_breakdown?: Json;
          extracted_topics?: Json;
          customer_pain_points?: Json;
          churn_risk_score?: number | null;
          suggested_action?: string | null;
          raw_response?: Json | null;
          created_at?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          organization_id: string;
          actor_user_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          changes: Json;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          actor_user_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          changes?: Json;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          actor_user_id?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          changes?: Json;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
      };
      job_queue: {
        Row: {
          id: string;
          organization_id: string;
          job_type: string;
          payload: Json;
          status: JobStatus;
          attempts: number;
          max_attempts: number;
          next_run_at: string;
          locked_at: string | null;
          locked_by: string | null;
          last_error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          job_type: string;
          payload?: Json;
          status?: JobStatus;
          attempts?: number;
          max_attempts?: number;
          next_run_at?: string;
          locked_at?: string | null;
          locked_by?: string | null;
          last_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          job_type?: string;
          payload?: Json;
          status?: JobStatus;
          attempts?: number;
          max_attempts?: number;
          next_run_at?: string;
          locked_at?: string | null;
          locked_by?: string | null;
          last_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Functions: {
      get_user_org_ids: {
        Args: { lookup_user_id: string };
        Returns: string[];
      };
      is_org_admin: {
        Args: { org_id: string; lookup_user_id: string };
        Returns: boolean;
      };
      claim_next_job: {
        Args: {
          p_worker_id: string;
          p_lock_duration_seconds?: number;
        };
        Returns: {
          id: string;
          organization_id: string;
          job_type: string;
          payload: Json;
          attempts: number;
          max_attempts: number;
        }[];
      };
    };
  };
}
