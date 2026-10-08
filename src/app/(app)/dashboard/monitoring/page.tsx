import {
  Compass,
  Play,
  Pause,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const MOCK_TARGETS = [
  {
    id: "mon_1",
    targetName: "Trustpilot Main Domain Crawler",
    cadence: "Every 6 Hours",
    status: "active",
    lastRun: "35 mins ago",
    nextRun: "In 5 hours 25 mins",
    successRate: "99.8%",
    failureCount: 0,
  },
  {
    id: "mon_2",
    targetName: "Google Maps Headquarters Review Poller",
    cadence: "Daily (02:00 UTC)",
    status: "active",
    lastRun: "6 hours ago",
    nextRun: "In 18 hours",
    successRate: "100%",
    failureCount: 0,
  },
  {
    id: "mon_3",
    targetName: "Reddit Brand Sentiment Monitor",
    cadence: "Hourly",
    status: "paused",
    lastRun: "2 days ago",
    nextRun: "Paused by admin",
    successRate: "95.4%",
    failureCount: 1,
  },
  {
    id: "mon_4",
    targetName: "G2 Competitive Cohort Ingest",
    cadence: "Weekly",
    status: "active",
    lastRun: "3 days ago",
    nextRun: "In 4 days",
    successRate: "100%",
    failureCount: 0,
  },
];

export default function MonitoringPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Monitoring Targets & Ingestion Cadence
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Automate recurring data acquisition jobs and track synchronization health.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Force Sync All</span>
          </Button>
          <Button size="sm" className="gap-1.5 text-xs bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900">
            <Compass className="h-3.5 w-3.5" />
            <span>New Monitor</span>
          </Button>
        </div>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Active Polling Jobs</div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mt-1">3 / 4</div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            <span>Operational & Healthy</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Average Uptime & Success</div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mt-1">99.2%</div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">Over past 30 days</div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total Pipeline Runs (24h)</div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mt-1">142 runs</div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">0 failures detected</div>
        </div>
      </div>

      {/* Targets Table */}
      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50 font-medium text-zinc-500 dark:text-zinc-400">
            <tr>
              <th className="p-4">Target Pipeline</th>
              <th className="p-4">Schedule Cadence</th>
              <th className="p-4">Status</th>
              <th className="p-4">Last Run</th>
              <th className="p-4">Next Scheduled Run</th>
              <th className="p-4">Success Rate</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {MOCK_TARGETS.map((target) => (
              <tr key={target.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors">
                <td className="p-4 font-semibold text-zinc-900 dark:text-zinc-100">
                  {target.targetName}
                </td>
                <td className="p-4 text-zinc-600 dark:text-zinc-400 font-medium flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-zinc-400" />
                  <span>{target.cadence}</span>
                </td>
                <td className="p-4">
                  {target.status === "active" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      <Pause className="h-3 w-3" />
                      Paused
                    </span>
                  )}
                </td>
                <td className="p-4 text-zinc-500 dark:text-zinc-400">{target.lastRun}</td>
                <td className="p-4 text-zinc-500 dark:text-zinc-400">{target.nextRun}</td>
                <td className="p-4 font-mono font-medium text-emerald-600 dark:text-emerald-400">
                  {target.successRate}
                </td>
                <td className="p-4 text-right">
                  <Button variant="ghost" size="sm" className="text-xs">
                    {target.status === "active" ? "Pause" : "Resume"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
