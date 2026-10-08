import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  ArrowUpRight,
  Download,
  Filter,
  MessageSquare,
  Plus,
  Radio,
  RefreshCw,
  Sparkles,
  TrendingUp,
} from "lucide-react";

export default function DashboardPage() {
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
              Tenant: Acme Global
            </Badge>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Real-time multi-channel sentiment monitoring, entity discovery, and OmniRoute AI synthesis.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Sync Sources</span>
          </Button>
          <Button size="sm" className="gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" />
            <span>Add Target</span>
          </Button>
        </div>
      </div>

      {/* KPI Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Total Ingested Reviews
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">14,892</div>
            <div className="flex items-center gap-1 text-xs text-emerald-600 mt-1">
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>+12.4% vs last 30 days</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              CX Sentiment Score
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">78 / 100</div>
            <div className="flex items-center gap-1 text-xs text-emerald-600 mt-1">
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>+4.2 pts improvement</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Active Verified Sources
            </CardTitle>
            <Radio className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">9 Channels</div>
            <div className="flex items-center gap-1 text-xs text-zinc-500 mt-1">
              <span>Trustpilot, Google Maps, Reddit, App Store</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Critical Anomalies
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">2 Emerging</div>
            <div className="flex items-center gap-1 text-xs text-zinc-500 mt-1">
              <span>Requires product attention</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* OmniRoute AI Insights Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-zinc-200 dark:border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-500" />
                <CardTitle className="text-base font-semibold">
                  OmniRoute AI Synthesized Insights
                </CardTitle>
              </div>
              <CardDescription className="mt-1">
                Automated root-cause analysis clustered across multi-channel ingestion streams.
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-[11px]">
              Model: OmniRoute Intelligence
            </Badge>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-950 dark:bg-amber-950/20">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="warning" className="text-[10px]">
                    High Priority Issue
                  </Badge>
                  <span className="text-xs text-zinc-500">Detected 2 hours ago</span>
                </div>
                <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                  18 reviews affected
                </span>
              </div>
              <h4 className="mt-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Checkout session timeout during credit card 3D Secure verification
              </h4>
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Customers on iOS App Store (v2.4.1) and Trustpilot report repeated timeout errors when completing Stripe 3DS verification. Correlated with a 1.8-star drop in today&apos;s iOS intake.
              </p>
            </div>

            <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-950 dark:bg-emerald-950/20">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="success" className="text-[10px]">
                    Positive Trend
                  </Badge>
                  <span className="text-xs text-zinc-500">Detected yesterday</span>
                </div>
                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  34 reviews affected
                </span>
              </div>
              <h4 className="mt-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Widespread customer praise for new automated PDF export feature
              </h4>
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                G2 and Capterra reviews highlight substantial time savings following the recent reporting upgrade. Positive sentiment up +18% in the enterprise segment.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Monitoring Channels Overview */}
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Active Monitoring Targets</CardTitle>
            <CardDescription>Verified channels receiving periodic crawl syncs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { name: "Trustpilot US", status: "Healthy", count: "4,210 reviews", score: "4.4 / 5.0" },
              { name: "Google Maps NY HQ", status: "Healthy", count: "1,890 reviews", score: "4.7 / 5.0" },
              { name: "iOS App Store", status: "Warning", count: "6,120 reviews", score: "3.9 / 5.0" },
              { name: "r/AcmeCommunity", status: "Healthy", count: "940 threads", score: "72% Pos" },
              { name: "G2 Enterprise", status: "Healthy", count: "1,732 reviews", score: "4.6 / 5.0" },
            ].map((channel, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border border-zinc-100 p-2.5 text-xs dark:border-zinc-800/80 dark:bg-zinc-900/40"
              >
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">{channel.name}</p>
                  <p className="text-[10px] text-zinc-500">{channel.count}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-zinc-800 dark:text-zinc-200">{channel.score}</p>
                  <span
                    className={`inline-block text-[10px] font-medium ${
                      channel.status === "Warning" ? "text-amber-500" : "text-emerald-500"
                    }`}
                  >
                    {channel.status}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Ingestion Stream Placeholder */}
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Recent Ingested Feedback Stream</CardTitle>
            <CardDescription>
              Raw customer feedback normalized and prepped for OmniRoute analysis.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1 text-xs">
              <Filter className="h-3.5 w-3.5" />
              <span>Filter</span>
            </Button>
            <Button variant="outline" size="sm" className="gap-1 text-xs">
              <Download className="h-3.5 w-3.5" />
              <span>Export</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
                  <th className="pb-3 font-medium">Source</th>
                  <th className="pb-3 font-medium">Author / Location</th>
                  <th className="pb-3 font-medium">Snippet</th>
                  <th className="pb-3 font-medium">Rating</th>
                  <th className="pb-3 font-medium">Timestamp</th>
                  <th className="pb-3 font-medium">AI Classification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {[
                  {
                    source: "Trustpilot",
                    author: "David M.",
                    snippet: "Great onboarding experience, but payment failed three times...",
                    rating: "2/5",
                    time: "10 mins ago",
                    classification: "Checkout Bug",
                    variant: "destructive" as const,
                  },
                  {
                    source: "iOS Store",
                    author: "Sarah_K",
                    snippet: "Loving the new dashboard speed! Huge improvement over last quarter.",
                    rating: "5/5",
                    time: "32 mins ago",
                    classification: "Performance",
                    variant: "success" as const,
                  },
                  {
                    source: "G2 Crowd",
                    author: "Enterprise Admin",
                    snippet: "Solid reporting capabilities for our quarterly CX reviews.",
                    rating: "5/5",
                    time: "1 hour ago",
                    classification: "Feature Praise",
                    variant: "success" as const,
                  },
                  {
                    source: "Google Maps",
                    author: "Local Guide",
                    snippet: "Quick customer support response when resolving account billing.",
                    rating: "4/5",
                    time: "3 hours ago",
                    classification: "Support Quality",
                    variant: "default" as const,
                  },
                ].map((row, idx) => (
                  <tr key={idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                    <td className="py-3 font-medium text-zinc-900 dark:text-zinc-100">
                      {row.source}
                    </td>
                    <td className="py-3 text-zinc-600 dark:text-zinc-400">{row.author}</td>
                    <td className="py-3 max-w-xs truncate text-zinc-600 dark:text-zinc-400">
                      {row.snippet}
                    </td>
                    <td className="py-3 font-semibold text-zinc-900 dark:text-zinc-100">
                      {row.rating}
                    </td>
                    <td className="py-3 text-zinc-500">{row.time}</td>
                    <td className="py-3">
                      <Badge variant={row.variant} className="text-[10px]">
                        {row.classification}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
