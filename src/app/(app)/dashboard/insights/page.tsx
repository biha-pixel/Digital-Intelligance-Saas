import Link from "next/link";
import { getCurrentOrg } from "@/lib/auth/session";
import { DashboardService } from "@/lib/dashboard/dashboard-service";
import { PipelineTriggerButton } from "@/components/dashboard/pipeline-trigger-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Lightbulb,
  ArrowRight,
  BrainCircuit,
  Database,
  MessageSquare,
} from "lucide-react";

export default async function InsightsPage() {
  const currentOrg = await getCurrentOrg();

  if (!currentOrg) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
        <Database className="h-12 w-12 text-zinc-400 mb-4" />
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          No Active Organization Found
        </h2>
        <p className="mt-2 text-sm text-zinc-500 max-w-md">
          Please select or create an organization to view AI insights.
        </p>
      </div>
    );
  }

  const dashboardService = new DashboardService();
  const insights = await dashboardService.getSynthesizedInsights(currentOrg.id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 px-3 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-2">
            <BrainCircuit className="h-3.5 w-3.5" />
            <span>OmniRoute AI Intelligence Engine</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Synthesized Customer Intelligence & Pain Points
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Automated thematic clustering, churn risk detection, and prescriptive remediation powered by OmniRoute AI.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/dashboard/feedback">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Feedback Stream</span>
            </Button>
          </Link>
          <PipelineTriggerButton />
        </div>
      </div>

      {/* AI Summary Banner */}
      <div className="p-5 rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/50 via-white to-purple-50/50 dark:border-indigo-900/50 dark:from-indigo-950/20 dark:via-zinc-900 dark:to-purple-950/20">
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-lg bg-indigo-600 text-white dark:bg-indigo-500">
            <Lightbulb className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              OmniRoute AI Executive Synthesis
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1 leading-relaxed">
              {insights.overallSummary}
            </p>
          </div>
        </div>
      </div>

      {/* Themes & Opportunities Grid */}
      {insights.themes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-800 p-12 text-center bg-white dark:bg-zinc-900">
          <BrainCircuit className="h-10 w-10 text-zinc-400 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            No Synthesized Themes Available Yet
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
            Once customer reviews are ingested and analyzed with OmniRoute AI, thematic friction points and growth drivers will appear here automatically.
          </p>
          <div className="mt-4">
            <PipelineTriggerButton />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {insights.themes.map((theme) => (
            <div
              key={theme.id}
              className="p-5 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      theme.severity === "high"
                        ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                        : theme.severity === "medium"
                        ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                        : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                    }`}
                  >
                    {theme.type}
                  </span>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {theme.title}
                  </h3>
                </div>

                <div className="flex items-center gap-3 text-xs text-zinc-500">
                  <span>{theme.affectedCount} customer mentions</span>
                  <span>•</span>
                  <span className="font-mono text-zinc-700 dark:text-zinc-300">
                    {theme.confidence} AI confidence
                  </span>
                </div>
              </div>

              <div className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {theme.summary}
              </div>

              <div className="p-3.5 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                    Prescriptive Action
                  </div>
                  <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
                    {theme.recommendation}
                  </div>
                  <div className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-0.5 font-medium">
                    {theme.impact}
                  </div>
                </div>

                <Link href="/dashboard/feedback">
                  <Button size="sm" variant="outline" className="text-xs shrink-0 gap-1">
                    <span>Inspect Raw Feedback</span>
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
