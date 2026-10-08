import {
  FileText,
  Download,
  Calendar,
  Sparkles,
  TrendingUp,
  FileSpreadsheet,
  FileCheck2,
  Clock,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const MOCK_REPORTS = [
  {
    id: "rep_1",
    title: "Executive CX & Sentiment Weekly (Oct W1)",
    period: "Oct 1, 2026 – Oct 7, 2026",
    summary:
      "Cross-channel CSAT averaged 4.6/5. Positive sentiment rose by 3.2% following the 2.4 platform rollout.",
    generatedAt: "Oct 7, 2026 (08:00 UTC)",
    format: "PDF & CSV",
    size: "2.4 MB",
    status: "ready",
  },
  {
    id: "rep_2",
    title: "Quarterly Enterprise Competitive Benchmark (Q3)",
    period: "Jul 1, 2026 – Sep 30, 2026",
    summary:
      "Deep comparative review of G2 and Trustpilot metrics against top 3 industry competitors. Net Promoter Score leads cohort by +12 pts.",
    generatedAt: "Oct 1, 2026",
    format: "PDF Presentation",
    size: "8.1 MB",
    status: "ready",
  },
  {
    id: "rep_3",
    title: "Monthly Regional Sentiment Breakdown (September)",
    period: "Sep 1, 2026 – Sep 30, 2026",
    summary:
      "Location-specific review breakdown across North America and Europe hubs. Identifies European crawl latency friction.",
    generatedAt: "Sep 30, 2026",
    format: "PDF & CSV",
    size: "3.6 MB",
    status: "ready",
  },
];

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Executive Intelligence & Scheduled Reports
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Automated PDF summaries, weekly leadership digests, and raw data export archives.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <Calendar className="h-3.5 w-3.5" />
            <span>Schedule Automated Report</span>
          </Button>
          <Button size="sm" className="gap-1.5 text-xs bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Generate Instant Digest</span>
          </Button>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {MOCK_REPORTS.map((report) => (
          <div
            key={report.id}
            className="p-5 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                  <FileText className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                  Available
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {report.title}
                </h3>
                <div className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5">
                  <Calendar className="h-3 w-3" />
                  <span>{report.period}</span>
                </div>
              </div>

              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed line-clamp-3">
                {report.summary}
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
              <div className="text-[11px] text-zinc-400 font-mono">
                {report.size}
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1">
                  <Download className="h-3 w-3" />
                  <span>Download</span>
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
