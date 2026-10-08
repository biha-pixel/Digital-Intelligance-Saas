import Link from "next/link";
import { getCurrentOrg } from "@/lib/auth/session";
import { DashboardService } from "@/lib/dashboard/dashboard-service";
import { PipelineTriggerButton } from "@/components/dashboard/pipeline-trigger-button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Database,
  ExternalLink,
  Flame,
  Globe,
  Layers,
  MessageSquare,
  Radio,
  Search,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const currentOrg = await getCurrentOrg();

  if (!currentOrg) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
        <Database className="h-12 w-12 text-zinc-400 mb-4" />
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          No Active Organization Found
        </h2>
        <p className="mt-2 text-sm text-zinc-500 max-w-md">
          Please select or create an organization to access customer experience intelligence analytics.
        </p>
        <Link href="/onboarding" className="mt-4">
          <Badge variant="default" className="cursor-pointer py-1.5 px-3">
            Go to Onboarding
          </Badge>
        </Link>
      </div>
    );
  }

  const dashboardService = new DashboardService();
  const data = await dashboardService.getDashboardOverview(currentOrg.id);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Customer Experience Intelligence
            </h1>
            <Badge variant="outline" className="text-xs">
              Tenant: {data.companyName}
            </Badge>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Real-time multi-channel sentiment monitoring, entity discovery, and OmniRoute AI synthesis.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <PipelineTriggerButton />
        </div>
      </div>

      {/* Discovery & Ingestion Pipeline Status Banner */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Discovery Status Card */}
        <Card className="border-indigo-100 dark:border-indigo-950/40 bg-indigo-50/30 dark:bg-indigo-950/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-indigo-900 dark:text-indigo-300">
                Discovery Engine Status
              </CardTitle>
            </div>
            <Badge variant={data.discovery.totalDiscovered > 0 ? "success" : "secondary"} className="text-[10px]">
              {data.discovery.totalDiscovered > 0 ? "Active" : "Pending Discovery"}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {data.discovery.totalDiscovered}
              </span>
              <span className="text-xs text-zinc-500">Candidate Sources Discovered</span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-indigo-100/60 dark:border-indigo-900/40 text-xs">
              <div>
                <span className="text-zinc-500 text-[11px]">Auto-Verified</span>
                <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {data.discovery.verifiedAutoCount}
                </p>
              </div>
              <div>
                <span className="text-zinc-500 text-[11px]">Unverified</span>
                <p className="font-semibold text-amber-600 dark:text-amber-400">
                  {data.discovery.unverifiedCount}
                </p>
              </div>
              <div>
                <span className="text-zinc-500 text-[11px]">Rejected / Noise</span>
                <p className="font-semibold text-zinc-600 dark:text-zinc-400">
                  {data.discovery.rejectedCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ingestion Status Card */}
        <Card className="border-blue-100 dark:border-blue-950/40 bg-blue-50/30 dark:bg-blue-950/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-blue-900 dark:text-blue-300">
                Ingestion Engine Status
              </CardTitle>
            </div>
            <Badge
              variant={
                data.ingestion.latestRunStatus === "completed"
                  ? "success"
                  : data.ingestion.latestRunStatus === "failed"
                  ? "destructive"
                  : "secondary"
              }
              className="text-[10px]"
            >
              {data.ingestion.latestRunStatus
                ? `Run: ${data.ingestion.latestRunStatus}`
                : "No Runs Yet"}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {data.ingestion.totalItemsExtracted}
              </span>
              <span className="text-xs text-zinc-500">Items Scraped & Ingested</span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-blue-100/60 dark:border-blue-900/40 text-xs">
              <div>
                <span className="text-zinc-500 text-[11px]">Completed Runs</span>
                <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {data.ingestion.completedRuns}
                </p>
              </div>
              <div>
                <span className="text-zinc-500 text-[11px]">Failed Runs</span>
                <p className="font-semibold text-rose-600 dark:text-rose-400">
                  {data.ingestion.failedRuns}
                </p>
              </div>
              <div>
                <span className="text-zinc-500 text-[11px]">Total Crawls</span>
                <p className="font-semibold text-zinc-600 dark:text-zinc-400">
                  {data.ingestion.totalRuns}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KPI Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Feedback & Analyzed Count */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Ingested Feedback
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.feedback.totalFeedbackCount}</div>
            <div className="flex items-center justify-between text-xs text-zinc-500 mt-1">
              <span className="text-emerald-600 font-medium">
                {data.feedback.analyzedCount} Analyzed
              </span>
              <span>{data.feedback.pendingAnalysisCount} Pending</span>
            </div>
          </CardContent>
        </Card>

        {/* CX Sentiment Score */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              CX Sentiment Score
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.feedback.overallSentimentScore}
              <span className="text-sm font-normal text-zinc-500"> / 100</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-zinc-500 mt-1">
              {data.feedback.averageRating ? (
                <span>Avg Rating: {data.feedback.averageRating} / 5.0</span>
              ) : (
                <span>Normalized from AI Sentiment</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Active Verified Sources */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Verified Sources
            </CardTitle>
            <Radio className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.sources.verifiedSources} Channels</div>
            <div className="flex items-center gap-1 text-xs text-zinc-500 mt-1">
              <span>{data.sources.activeSources} Active Monitoring Targets</span>
            </div>
          </CardContent>
        </Card>

        {/* Negative Feedback & Churn Risk */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Negative Feedback
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {data.feedback.negativePercentage}%
            </div>
            <div className="flex items-center gap-1 text-xs text-zinc-500 mt-1">
              <span>
                {data.feedback.sentimentBreakdown.negative +
                  data.feedback.sentimentBreakdown.veryNegative}{" "}
                negative items detected
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* OmniRoute AI Insights & Severe Feedback */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-zinc-200 dark:border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-500" />
                <CardTitle className="text-base font-semibold">
                  Severe Customer Feedback & Churn Risks
                </CardTitle>
              </div>
              <CardDescription className="mt-1">
                Automated high-urgency root-cause detection analyzed via OmniRoute AI Gateway.
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-[11px]">
              OmniRoute Synthesis
            </Badge>
          </CardHeader>

          <CardContent className="space-y-4">
            {data.severeFeedback.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2" />
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Zero High-Severity Complaints Detected
                </p>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                  {data.feedback.analyzedCount > 0
                    ? "All analyzed customer feedback is currently within normal operating sentiment thresholds."
                    : "Run the Discovery & Ingestion pipeline to ingest and analyze customer feedback."}
                </p>
              </div>
            ) : (
              data.severeFeedback.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-950 dark:bg-amber-950/20"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={item.severity === "critical" ? "destructive" : "warning"}
                        className="text-[10px]"
                      >
                        {item.severity.toUpperCase()} PRIORITY
                      </Badge>
                      <span className="text-xs text-zinc-500">
                        Source: {item.sourceType.replace("_", " ")}
                      </span>
                    </div>
                    {item.churnRiskScore >= 0.7 && (
                      <span className="text-xs font-semibold text-rose-700 dark:text-rose-400 flex items-center gap-1">
                        <Flame className="h-3.5 w-3.5" />
                        Churn Risk: {Math.round(item.churnRiskScore * 100)}%
                      </span>
                    )}
                  </div>
                  <h4 className="mt-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {item.summary}
                  </h4>
                  {item.complaintSummary && (
                    <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      {item.complaintSummary}
                    </p>
                  )}
                  {item.suggestedAction && (
                    <div className="mt-2 text-xs font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50/80 dark:bg-indigo-950/40 p-2 rounded border border-indigo-100 dark:border-indigo-900">
                      💡 Suggested Action: {item.suggestedAction}
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Common Topics Cluster */}
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Common Topics</CardTitle>
            <CardDescription>Extracted and clustered by OmniRoute AI</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.topics.length === 0 ? (
              <p className="text-xs text-zinc-500 py-6 text-center">
                No topic clusters identified yet.
              </p>
            ) : (
              data.topics.map((t, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-lg border border-zinc-100 p-2.5 text-xs dark:border-zinc-800/80 dark:bg-zinc-900/40"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-zinc-900 dark:text-zinc-100 capitalize">
                      {t.topic}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-zinc-500">{t.count} items</span>
                    <Badge
                      variant={t.sentimentRatio >= 0.5 ? "success" : "destructive"}
                      className="text-[10px]"
                    >
                      {Math.round(t.sentimentRatio * 100)}% Pos
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Discovered & Registered Sources Table */}
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">
              Discovered & Verified Sources
            </CardTitle>
            <CardDescription>
              External channels verified through multi-factor validation algorithms.
            </CardDescription>
          </div>
          <Link href="/dashboard/sources">
            <Badge variant="outline" className="cursor-pointer gap-1 text-xs">
              <span>View Registry</span>
              <ArrowUpRight className="h-3 w-3" />
            </Badge>
          </Link>
        </CardHeader>

        <CardContent>
          {data.sources.sourcesList.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500">
              No verified sources registered yet. Click &quot;Run Discovery & Ingestion Pipeline&quot; to auto-discover channels.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
                    <th className="pb-3 font-medium">Source / Platform</th>
                    <th className="pb-3 font-medium">URL</th>
                    <th className="pb-3 font-medium">Ownership</th>
                    <th className="pb-3 font-medium">Verification Status</th>
                    <th className="pb-3 font-medium">Confidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {data.sources.sourcesList.map((source) => (
                    <tr key={source.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                      <td className="py-3 font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5 text-zinc-400" />
                        <span>{source.displayName}</span>
                      </td>
                      <td className="py-3 text-zinc-600 dark:text-zinc-400 max-w-xs truncate">
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline flex items-center gap-1"
                        >
                          <span className="truncate">{source.url}</span>
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      </td>
                      <td className="py-3 capitalize text-zinc-600 dark:text-zinc-400">
                        {source.ownership.replace("_", " ")}
                      </td>
                      <td className="py-3">
                        <Badge
                          variant={
                            source.verificationStatus === "verified_auto" ||
                            source.verificationStatus === "verified_manual"
                              ? "success"
                              : "warning"
                          }
                          className="text-[10px]"
                        >
                          {source.verificationStatus}
                        </Badge>
                      </td>
                      <td className="py-3 font-semibold text-zinc-800 dark:text-zinc-200">
                        {Math.round(source.confidenceScore * 100)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
