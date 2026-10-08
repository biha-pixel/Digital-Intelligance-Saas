/**
 * CXPulse SaaS Database Type Definitions
 * Generated and aligned with 20261007000000_core_foundation_schema.sql
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
        Relationships: [];
      };
      organization_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: UserRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      company_profiles: {
        Row: {
          id: string;
          organization_id: string;
          company_name: string;
          display_name: string;
          primary_domain: string;
          country: string | null;
          locations: Json;
          industry: string | null;
          aliases: string[];
          social_handles: Json;
          completeness_score: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          company_name: string;
          display_name: string;
          primary_domain: string;
          country?: string | null;
          locations?: Json;
          industry?: string | null;
          aliases?: string[];
          social_handles?: Json;
          completeness_score?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          company_name?: string;
          display_name?: string;
          primary_domain?: string;
          country?: string | null;
          locations?: Json;
          industry?: string | null;
          aliases?: string[];
          social_handles?: Json;
          completeness_score?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "company_profiles_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      sources: {
        Row: {
          id: string;
          organization_id: string;
          company_profile_id: string | null;
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
          company_profile_id?: string | null;
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
          company_profile_id?: string | null;
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
        Relationships: [
          {
            foreignKeyName: "sources_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sources_company_profile_id_fkey";
            columns: ["company_profile_id"];
            isOneToOne: false;
            referencedRelation: "company_profiles";
            referencedColumns: ["id"];
          }
        ];
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
        Relationships: [
          {
            foreignKeyName: "monitoring_targets_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "monitoring_targets_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "sources";
            referencedColumns: ["id"];
          }
        ];
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
        Relationships: [
          {
            foreignKeyName: "ingestion_runs_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ingestion_runs_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "sources";
            referencedColumns: ["id"];
          }
        ];
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
        Relationships: [
          {
            foreignKeyName: "raw_scrapes_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "raw_scrapes_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "sources";
            referencedColumns: ["id"];
          }
        ];
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
        Relationships: [
          {
            foreignKeyName: "feedback_items_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "feedback_items_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "sources";
            referencedColumns: ["id"];
          }
        ];
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
        Relationships: [
          {
            foreignKeyName: "job_queue_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
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
        Args: { p_worker_id: string; p_lock_duration_seconds?: number };
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
    Enums: {
      user_role: UserRole;
      plan_tier: PlanTier;
      source_type: SourceType;
      source_status: SourceStatus;
      source_ownership: SourceOwnership;
      verification_status: VerificationStatus;
      monitoring_status: MonitoringStatus;
      ingestion_status: IngestionStatus;
      job_status: JobStatus;
      sentiment_enum: SentimentEnum;
      intent_enum: IntentEnum;
      language_quality_enum: LanguageQualityEnum;
    };
  };
}
