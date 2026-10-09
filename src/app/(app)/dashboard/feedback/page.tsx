import Link from "next/link";
import { getCurrentOrg } from "@/lib/auth/session";
import { DashboardService } from "@/lib/dashboard/dashboard-service";
import { PipelineTriggerButton } from "@/components/dashboard/pipeline-trigger-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Search,
  Filter,
  Star,
  ExternalLink,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Database,
  ArrowRight,
} from "lucide-react";

const SENTIMENT_CONFIG: Record<string, { label: string; badge: string }> = {
  very_positive: {
    label: "Very Positive",
    badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  },
  positive: {
    label: "Positive",
    badge: "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border-teal-200 dark:border-teal-800",
  },
  neutral: {
    label: "Neutral",
    badge: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700",
  },
  negative: {
    label: "Negative",
    badge: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
  very_negative: {
    label: "Critical / Negative",
    badge: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800",
  },
};

export default async function FeedbackPage() {
  const currentOrg = await getCurrentOrg();

  if (!currentOrg) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
        <Database className="h-12 w-12 text-zinc-400 mb-4" />
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          No Active Organization Found
        </h2>
        <p className="mt-2 text-sm text-zinc-500 max-w-md">
          Please select or create an organization to view feedback.
        </p>
      </div>
    );
  }

  const dashboardService = new DashboardService();
  const [feedbackItems, overview] = await Promise.all([
    dashboardService.getFeedbackFeed(currentOrg.id),
    dashboardService.getDashboardOverview(currentOrg.id),
  ]);

  const totalFeedbackCount = overview.feedback.totalFeedbackCount;
  const avgRating = overview.feedback.averageRating ?? 0;
  const positiveRatio = (100 - overview.feedback.negativePercentage).toFixed(1);
  const severeCount = overview.severeFeedback.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Unified Feedback Stream
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Real-time feed of multi-channel customer reviews, ratings, and AI sentiment analyses.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/dashboard/insights">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Sparkles className="h-3.5 w-3.5" />
              <span>AI Cluster Insights</span>
            </Button>
          </Link>
          <PipelineTriggerButton />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total Ingested Items</div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mt-1">
            {totalFeedbackCount.toLocaleString()}
          </div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-1">
            <span>From registered review channels</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Average CSAT / Rating</div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mt-1 flex items-baseline gap-1">
            <span>{avgRating > 0 ? avgRating : "—"}</span>
            {avgRating > 0 && <span className="text-xs font-normal text-zinc-400">/ 5.0</span>}
          </div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
            {overview.sources.totalSources} active sources
          </div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Positive Sentiment Ratio</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {totalFeedbackCount > 0 ? `${positiveRatio}%` : "—"}
          </div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">OmniRoute NLP classified</div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Severe Friction Points</div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
            {severeCount} {severeCount === 1 ? "item" : "items"}
          </div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">High churn risk identified</div>
        </div>
      </div>

      {/* Feed List */}
      {feedbackItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-800 p-12 text-center bg-white dark:bg-zinc-900">
          <MessageSquare className="h-10 w-10 text-zinc-400 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            No Feedback Items Ingested Yet
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
            Click &quot;Run Live Pipeline&quot; above to discover company sources, crawl reviews, and analyze feedback using OmniRoute AI.
          </p>
          <div className="mt-4">
            <PipelineTriggerButton />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {feedbackItems.map((item) => {
            const sentimentKey = item.sentimentLabel || "neutral";
            const sentimentStyle =
              SENTIMENT_CONFIG[sentimentKey] || SENTIMENT_CONFIG.neutral;

            const timeAgo = item.publishedAt
              ? new Date(item.publishedAt).toLocaleDateString()
              : new Date(item.createdAt).toLocaleDateString();

            return (
              <div
                key={item.id}
                className="p-5 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 transition-all hover:border-zinc-300 dark:hover:border-zinc-700"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800/60 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      {item.author.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                        {item.author}
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        Via <span className="font-medium text-zinc-600 dark:text-zinc-300 capitalize">{item.sourceType.replace("_", " ")}</span> · {timeAgo}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Rating Stars */}
                    {item.rating !== null && item.rating !== undefined && (
                      <div className="flex items-center gap-0.5 text-amber-500">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3.5 w-3.5 ${
                              i < (item.rating || 0)
                                ? "fill-amber-400 text-amber-400"
                                : "text-zinc-200 dark:text-zinc-800"
                            }`}
                          />
                        ))}
                      </div>
                    )}

                    {/* Sentiment Badge */}
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${sentimentStyle.badge}`}
                    >
                      {sentimentStyle.label}
                    </span>

                    {/* Churn Risk Badge if critical */}
                    {item.churnRiskScore && item.churnRiskScore >= 0.7 && (
                      <Badge variant="destructive" className="text-[10px] uppercase font-bold py-0.5 px-2">
                        Risk: {Math.round(item.churnRiskScore * 100)}%
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Body */}
                <div className="mt-3">
                  {item.title && (
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                      {item.title}
                    </h3>
                  )}
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    {item.content}
                  </p>
                </div>

                {/* Suggested Action / Pain Points */}
                {item.suggestedAction && (
                  <div className="mt-3 p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/60 dark:border-zinc-800/80 flex items-start gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
                    <div className="text-[11px] text-zinc-700 dark:text-zinc-300">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">AI Suggested Action: </span>
                      {item.suggestedAction}
                    </div>
                  </div>
                )}

                {/* Footer Topics */}
                {item.topics && item.topics.length > 0 && (
                  <div className="mt-4 flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800/60">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                        Topics:
                      </span>
                      {item.topics.map((topic) => (
                        <span
                          key={topic}
                          className="rounded bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:text-zinc-400"
                        >
                          #{topic}
                        </span>
                      ))}
                    </div>

                    {item.sourceUrl && (
                      <a
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1"
                      >
                        <span>View Source</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
