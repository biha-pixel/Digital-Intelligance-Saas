import {
  Bell,
  Plus,
  Mail,
  Webhook,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const MOCK_ALERT_RULES = [
  {
    id: "alert_1",
    name: "Critical Negative Review Surge",
    trigger: "Negative sentiment ratio exceeds 25% in a 6-hour window",
    channel: "Slack (#cx-incident-response) & Email",
    channelType: "slack",
    status: "active",
    lastTriggered: "14 days ago",
  },
  {
    id: "alert_2",
    name: "VIP / Enterprise Account Mention",
    trigger: "Reviews or comments mentioning Fortune 500 domain keywords",
    channel: "Email (leadership@acme.com)",
    channelType: "email",
    status: "active",
    lastTriggered: "3 hours ago",
  },
  {
    id: "alert_3",
    name: "Crawler Ingestion Failure / Outage",
    trigger: "Any crawler target fails 2 consecutive sync runs",
    channel: "PagerDuty & Engineering Webhook",
    channelType: "webhook",
    status: "active",
    lastTriggered: "Never",
  },
  {
    id: "alert_4",
    name: "1-Star Rating Instant Notification",
    trigger: "Immediate dispatch on 1-Star rating on Trustpilot or Google Maps",
    channel: "Slack (#customer-success-ops)",
    channelType: "slack",
    status: "paused",
    lastTriggered: "4 days ago",
  },
];

export default function AlertsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Real-Time Alert Rules & Notification Channels
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Configure automated thresholds, sentiment anomaly alerts, and multi-channel dispatch hooks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" className="gap-1.5 text-xs bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900">
            <Plus className="h-3.5 w-3.5" />
            <span>Create Alert Rule</span>
          </Button>
        </div>
      </div>

      {/* Rules List */}
      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50 font-medium text-zinc-500 dark:text-zinc-400">
            <tr>
              <th className="p-4">Alert Name</th>
              <th className="p-4">Trigger Condition</th>
              <th className="p-4">Dispatch Channels</th>
              <th className="p-4">Status</th>
              <th className="p-4">Last Fired</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {MOCK_ALERT_RULES.map((rule) => (
              <tr key={rule.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors">
                <td className="p-4 font-semibold text-zinc-900 dark:text-zinc-100">
                  {rule.name}
                </td>
                <td className="p-4 text-zinc-600 dark:text-zinc-400 font-medium max-w-xs">
                  {rule.trigger}
                </td>
                <td className="p-4 text-zinc-700 dark:text-zinc-300">
                  <div className="flex items-center gap-1.5">
                    {rule.channelType === "slack" && <MessageSquare className="h-3.5 w-3.5 text-indigo-500" />}
                    {rule.channelType === "email" && <Mail className="h-3.5 w-3.5 text-emerald-500" />}
                    {rule.channelType === "webhook" && <Webhook className="h-3.5 w-3.5 text-amber-500" />}
                    <span>{rule.channel}</span>
                  </div>
                </td>
                <td className="p-4">
                  {rule.status === "active" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      Paused
                    </span>
                  )}
                </td>
                <td className="p-4 text-zinc-500 dark:text-zinc-400">{rule.lastTriggered}</td>
                <td className="p-4 text-right">
                  <Button variant="ghost" size="sm" className="text-xs">
                    Configure
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
