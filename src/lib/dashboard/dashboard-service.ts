import { SupabaseClient } from "@supabase/supabase-js";
import { Database, SourceType } from "@/types/database.types";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  DashboardOverviewData,
  DashboardDiscoveryMetrics,
  DashboardSourceMetrics,
  DashboardIngestionMetrics,
  DashboardFeedbackMetrics,
  DashboardTopicCluster,
  DashboardSevereFeedback,
} from "./types";

export class DashboardService {
  constructor(private supabaseClient?: SupabaseClient<Database>) {}

  private async getClient(): Promise<SupabaseClient<Database>> {
    if (this.supabaseClient) return this.supabaseClient;
    try {
      return await createClient();
    } catch {
      return createAdminClient();
    }
  }

  /**
   * Retrieves unified dashboard metrics for an organization
   */
  async getDashboardOverview(orgId: string): Promise<DashboardOverviewData> {
    const supabase = await this.getClient();

    // 1. Company Profile Details
    const { data: profile } = await supabase
      .from("company_profiles")
      .select("name")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const companyName = profile?.name || "Your Company";
    const isConfigured = !!profile;

    // 2. Discovery Metrics
    const { data: discoveries } = await supabase
      .from("source_discoveries")
      .select("status, discovered_at")
      .eq("organization_id", orgId);

    const discoveryMetrics: DashboardDiscoveryMetrics = {
      totalDiscovered: discoveries?.length || 0,
      unverifiedCount: discoveries?.filter((d) => d.status === "unverified" || d.status === "pending").length || 0,
      verifiedAutoCount: discoveries?.filter((d) => d.status === "verified_auto" || d.status === "approved").length || 0,
      rejectedCount: discoveries?.filter((d) => d.status === "rejected").length || 0,
      latestDiscoveryDate: discoveries?.[0]?.discovered_at,
    };

    // 3. Source Registry Metrics
    const { data: sources } = await supabase
      .from("sources")
      .select("id, url, source_type, display_name, ownership, verification_status, confidence_score, is_active")
      .eq("organization_id", orgId);

    const initialSourceTypes: Record<SourceType, number> = {
      trustpilot: 0,
      google_maps: 0,
      g2: 0,
      capterra: 0,
      yelp: 0,
      reddit: 0,
      app_store: 0,
      play_store: 0,
      generic_web: 0,
    };

    const sourcesByType = (sources || []).reduce((acc, s) => {
      const type = s.source_type as SourceType;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, initialSourceTypes);

    const sourceMetrics: DashboardSourceMetrics = {
      totalSources: sources?.length || 0,
      activeSources: sources?.filter((s) => s.is_active).length || 0,
      verifiedSources:
        sources?.filter((s) => s.verification_status === "verified_auto" || s.verification_status === "verified_manual")
          .length || 0,
      sourcesByType,
      sourcesList: (sources || []).map((s) => ({
        id: s.id,
        url: s.url,
        sourceType: s.source_type as SourceType,
        displayName: s.display_name || s.url,
        ownership: s.ownership,
        verificationStatus: s.verification_status,
        confidenceScore: s.confidence_score,
      })),
    };

    // 4. Ingestion Runs Metrics
    const { data: ingestionRuns } = await supabase
      .from("ingestion_runs")
      .select("status, started_at, items_new")
      .eq("organization_id", orgId)
      .order("started_at", { ascending: false });

    const totalItemsExtracted = (ingestionRuns || []).reduce((acc, r) => acc + (r.items_new || 0), 0);

    const ingestionMetrics: DashboardIngestionMetrics = {
      totalRuns: ingestionRuns?.length || 0,
      completedRuns: ingestionRuns?.filter((r) => r.status === "completed").length || 0,
      failedRuns: ingestionRuns?.filter((r) => r.status === "failed").length || 0,
      latestRunStatus: ingestionRuns?.[0]?.status,
      latestRunDate: ingestionRuns?.[0]?.started_at,
      totalItemsExtracted,
    };

    // 5. Feedback Items Metrics
    const { data: feedbackItems } = await supabase
      .from("feedback_items")
      .select("id, rating, sentiment_label, sentiment_score")
      .eq("organization_id", orgId);

    const totalFeedbackCount = feedbackItems?.length || 0;
    const analyzedItems = feedbackItems?.filter((f) => f.sentiment_label !== null) || [];
    const analyzedCount = analyzedItems.length;
    const pendingAnalysisCount = totalFeedbackCount - analyzedCount;

    const sentimentBreakdown = {
      veryPositive: 0,
      positive: 0,
      neutral: 0,
      negative: 0,
      veryNegative: 0,
    };

    let totalSentimentScore = 0;
    let scoreCount = 0;
    let totalRatingSum = 0;
    let ratingCount = 0;

    feedbackItems?.forEach((item) => {
      if (item.rating !== null && item.rating !== undefined) {
        totalRatingSum += Number(item.rating);
        ratingCount++;
      }

      if (item.sentiment_score !== null && item.sentiment_score !== undefined) {
        // sentiment score is -1.0 to 1.0; map to 0 - 100
        const normalizedScore = (item.sentiment_score + 1) * 50;
        totalSentimentScore += normalizedScore;
        scoreCount++;
      }

      switch (item.sentiment_label) {
        case "very_positive":
          sentimentBreakdown.veryPositive++;
          break;
        case "positive":
          sentimentBreakdown.positive++;
          break;
        case "neutral":
          sentimentBreakdown.neutral++;
          break;
        case "negative":
          sentimentBreakdown.negative++;
          break;
        case "very_negative":
          sentimentBreakdown.veryNegative++;
          break;
      }
    });

    const negativeCount = sentimentBreakdown.negative + sentimentBreakdown.veryNegative;
    const negativePercentage = analyzedCount > 0 ? (negativeCount / analyzedCount) * 100 : 0;
    const averageRating = ratingCount > 0 ? Number((totalRatingSum / ratingCount).toFixed(1)) : null;
    const overallSentimentScore = scoreCount > 0 ? Math.round(totalSentimentScore / scoreCount) : 0;

    const feedbackMetrics: DashboardFeedbackMetrics = {
      totalFeedbackCount,
      analyzedCount,
      pendingAnalysisCount,
      sentimentBreakdown,
      negativePercentage: Number(negativePercentage.toFixed(1)),
      averageRating,
      overallSentimentScore,
    };

    // 6. Topics & Severe Feedback from feedback_analyses
    const { data: analyses } = await supabase
      .from("feedback_analyses")
      .select("id, feedback_item_id, extracted_topics, churn_risk_score, suggested_action, raw_response, created_at, feedback_items(source_type, source_url)")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });

    // Aggregate Topics
    const topicMap = new Map<string, { count: number; positiveCount: number }>();
    const severeFeedbackList: DashboardSevereFeedback[] = [];

    (analyses || []).forEach((analysis: any) => {
      const raw = analysis.raw_response as any;
      const isPositive = raw?.sentiment === "positive" || raw?.sentiment === "very_positive";

      if (Array.isArray(analysis.extracted_topics)) {
        analysis.extracted_topics.forEach((topic: string) => {
          const current = topicMap.get(topic) || { count: 0, positiveCount: 0 };
          current.count++;
          if (isPositive) current.positiveCount++;
          topicMap.set(topic, current);
        });
      }

      // Check for high severity / churn risk
      const severity = raw?.severity || "low";
      const churnRisk = analysis.churn_risk_score || 0;
      if (severity === "high" || severity === "critical" || churnRisk >= 0.70) {
        severeFeedbackList.push({
          id: analysis.id,
          feedbackItemId: analysis.feedback_item_id,
          severity,
          intent: raw?.intent || "complaint",
          summary: raw?.conciseSummary || "Customer issue detected",
          complaintSummary: raw?.complaintSummary || undefined,
          churnRiskScore: churnRisk,
          suggestedAction: analysis.suggested_action || undefined,
          sourceType: analysis.feedback_items?.source_type || "generic_web",
          sourceUrl: analysis.feedback_items?.source_url || "",
          createdAt: analysis.created_at,
        });
      }
    });

    const topics: DashboardTopicCluster[] = Array.from(topicMap.entries())
      .map(([topic, data]) => ({
        topic,
        count: data.count,
        sentimentRatio: data.count > 0 ? Number((data.positiveCount / data.count).toFixed(2)) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return {
      organizationId: orgId,
      companyName,
      discovery: discoveryMetrics,
      sources: sourceMetrics,
      ingestion: ingestionMetrics,
      feedback: feedbackMetrics,
      topics,
      severeFeedback: severeFeedbackList.slice(0, 5),
      isConfigured,
    };
  }
}
