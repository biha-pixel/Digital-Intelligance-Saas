import {
  Sparkles,
  Zap,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  ArrowRight,
  BarChart,
  BrainCircuit,
  MessageSquareCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const INSIGHT_THEMES = [
  {
    id: "theme_1",
    title: "Onboarding Latency in EU Region",
    type: "Urgent Pain Point",
    severity: "high",
    affectedCount: 42,
    confidence: "94%",
    summary:
      "Multiple Trustpilot & Reddit reviews in Germany and France note a 45-second latency delay during initial database indexing for multi-branch organizations.",
    recommendation:
      "Enable geo-distributed Edge caching for the European discovery crawler queue.",
    impact: "High Churn Risk Reduction (+8% NPS projected)",
  },
  {
    id: "theme_2",
    title: "Universal Praise for Executive PDF Reporting",
    type: "Positive Growth Driver",
    severity: "low",
    affectedCount: 128,
    confidence: "98%",
    summary:
      "B2B VP-level customers on G2 specifically highlight automated weekly executive summaries as a key driver for upgrading to Enterprise Tier.",
    recommendation:
      "Incorporate custom corporate branding and white-label report exports in Tier 2.",
    impact: "Expansion Revenue Opportunity (+15% ARR expansion)",
  },
  {
    id: "theme_3",
    title: "Webhook Payload Granularity Requests",
    type: "Feature Request",
    severity: "medium",
    affectedCount: 31,
    confidence: "88%",
    summary:
      "Engineering teams in tech subreddits request filtered Slack webhooks by sentiment threshold instead of receiving all raw feedback items.",
    recommendation:
      "Add sentiment severity filters to the Alert Rules configuration dashboard.",
    impact: "Increases daily active engagement with developer personas",
  },
];

export default function InsightsPage() {
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
          <Button size="sm" className="gap-1.5 text-xs bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Regenerate Synthesis</span>
          </Button>
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
              OmniRoute AI Executive Synthesis (Past 7 Days)
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1 leading-relaxed">
              Customer sentiment across 2,406 multi-channel data points remains predominantly positive at <strong>88.4%</strong>. The primary emerging friction cluster centers on European onboarding crawl latency, while executive reporting satisfaction is driving significant customer advocacy and renewal confidence.
            </p>
          </div>
        </div>
      </div>

      {/* Themes & Opportunities Grid */}
      <div className="grid grid-cols-1 gap-4">
        {INSIGHT_THEMES.map((theme) => (
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

              <Button size="sm" variant="outline" className="text-xs shrink-0 gap-1">
                <span>Create Linear / Jira Ticket</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
