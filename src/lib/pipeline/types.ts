import { FeedbackAnalysisExecution } from "@/lib/analysis/types";
import { IngestionExecutionSummary } from "@/lib/feedback/ingestion";
import { CandidateSource } from "@/lib/discovery/types";
import { VerificationResult } from "@/lib/sources/types";

export interface PipelineRunOptions {
  companyProfileId?: string;
  sourceLimit?: number;
  skipCrawl?: boolean;
  skipAnalysis?: boolean;
  model?: string;
  timeoutMs?: number;
}

export type PipelineStepStatus = "pending" | "processing" | "completed" | "failed" | "skipped";

export interface PipelineStepOutcome {
  step: string;
  status: PipelineStepStatus;
  startedAt: string;
  completedAt?: string;
  error?: string;
  metadata?: Record<string, any>;
}

export interface PipelineRunSummary {
  runId: string;
  organizationId: string;
  companyProfileId: string;
  status: PipelineStepStatus;
  startedAt: string;
  finishedAt?: string;
  steps: PipelineStepOutcome[];
  error?: string;
  stats: {
    candidatesDiscovered: number;
    sourcesVerified: number;
    sourcesIngested: number;
    feedbackItemsExtracted: number;
    feedbackItemsAnalyzed: number;
    totalTokens: number;
    totalCostUsd: number;
    durationMs: number;
  };
  details: {
    candidates?: CandidateSource[];
    verifications?: VerificationResult[];
    ingestions?: IngestionExecutionSummary[];
    analyses?: FeedbackAnalysisExecution[];
  };
}
