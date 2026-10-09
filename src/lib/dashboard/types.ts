import { SourceType, SourceOwnership, VerificationStatus } from "@/types/database.types";

export interface DashboardDiscoveryMetrics {
  totalDiscovered: number;
  unverifiedCount: number;
  verifiedAutoCount: number;
  rejectedCount: number;
  latestDiscoveryDate?: string;
}

export interface DashboardSourceMetrics {
  totalSources: number;
  activeSources: number;
  verifiedSources: number;
  sourcesByType: Record<SourceType, number>;
  sourcesList: Array<{
    id: string;
    url: string;
    sourceType: SourceType;
    displayName: string;
    ownership: SourceOwnership;
    verificationStatus: VerificationStatus;
    confidenceScore: number;
  }>;
}

export interface DashboardIngestionMetrics {
  totalRuns: number;
  completedRuns: number;
  failedRuns: number;
  latestRunStatus?: string;
  latestRunDate?: string;
  totalItemsExtracted: number;
}

export interface DashboardFeedbackMetrics {
  totalFeedbackCount: number;
  analyzedCount: number;
  pendingAnalysisCount: number;
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
    veryPositive: number;
    veryNegative: number;
  };
  negativePercentage: number;
  averageRating: number | null;
  overallSentimentScore: number; // 0 - 100
}

export interface DashboardTopicCluster {
  topic: string;
  count: number;
  sentimentRatio: number; // 0.0 - 1.0 (positive proportion)
}

export interface DashboardSevereFeedback {
  id: string;
  feedbackItemId: string;
  severity: "low" | "medium" | "high" | "critical";
  intent: string;
  summary: string;
  complaintSummary?: string;
  churnRiskScore: number;
  suggestedAction?: string;
  sourceType: SourceType;
  sourceUrl: string;
  createdAt: string;
}

export interface DashboardOverviewData {
  organizationId: string;
  companyName: string;
  discovery: DashboardDiscoveryMetrics;
  sources: DashboardSourceMetrics;
  ingestion: DashboardIngestionMetrics;
  feedback: DashboardFeedbackMetrics;
  topics: DashboardTopicCluster[];
  severeFeedback: DashboardSevereFeedback[];
  isConfigured: boolean;
}

export interface FeedbackItemWithAnalysis {
  id: string;
  sourceId: string;
  sourceType: SourceType;
  sourceUrl: string;
  author: string;
  title: string | null;
  content: string;
  rating: number | null;
  sentimentLabel: string | null;
  sentimentScore: number | null;
  topics: string[];
  intent: string | null;
  painPoints: string[];
  suggestedAction: string | null;
  churnRiskScore: number | null;
  createdAt: string;
  publishedAt: string | null;
}

export interface SynthesizedInsightTheme {
  id: string;
  title: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  affectedCount: number;
  confidence: string;
  summary: string;
  recommendation: string;
  impact: string;
}

