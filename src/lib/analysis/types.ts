import { NormalizedFeedbackItem } from "@/types/feedback.types";
import { FeedbackAnalysisResult } from "./schemas";

/**
 * Lifecycle status of an analysis task for a given feedback item.
 */
export type AnalysisStatus = "pending" | "processing" | "completed" | "failed";

/**
 * Structured confidence telemetry across analytical dimensions.
 */
export interface AnalysisConfidence {
  sentimentConfidence: number; // 0.0 to 1.0
  intentConfidence: number; // 0.0 to 1.0
  overallConfidence: number; // 0.0 to 1.0
}

/**
 * Options provided when analyzing an individual feedback item.
 */
export interface AnalysisOptions {
  /** Override default model or tier */
  model?: string;
  /** Override prompt template version (e.g. 'v1.0.0', 'v2.0.0') */
  promptVersion?: string;
  /** Whether to persist the result to Supabase database (default true if client provided) */
  persist?: boolean;
  /** Tenant organization ID */
  organizationId?: string;
  /** Optional company context (e.g. company name, industry, product lines) */
  companyContext?: {
    name?: string;
    industry?: string;
    keyFeatures?: string[];
  };
  /** Request timeout in ms */
  timeoutMs?: number;
}

/**
 * Full execution result containing the analysis data, execution telemetry, and database ID.
 */
export interface FeedbackAnalysisExecution {
  id?: string; // Database ID in feedback_analyses
  feedbackItemId: string;
  organizationId: string;
  status: AnalysisStatus;
  result?: FeedbackAnalysisResult;
  model: string;
  provider: string;
  promptVersion: string;
  analyzedAt: string;
  durationMs: number;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
  failureReason?: string;
  confidence?: AnalysisConfidence;
}

/**
 * Options for batch analysis processing.
 */
export interface BatchAnalysisOptions extends AnalysisOptions {
  /** Maximum number of concurrent AI calls (default: 3) */
  concurrency?: number;
  /** Stop batch execution if error rate exceeds threshold (0.0 - 1.0) */
  stopOnErrorThreshold?: number;
}

/**
 * Summary metrics of a batch analysis operation.
 */
export interface BatchAnalysisSummary {
  total: number;
  completed: number;
  failed: number;
  skipped: number;
  durationMs: number;
  totalTokens: number;
  totalCostUsd: number;
  executions: FeedbackAnalysisExecution[];
}
