import Link from "next/link";
import {
  Database,
  Plus,
  Search,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const MOCK_SOURCES = [
  {
    id: "src_1",
    name: "Trustpilot Reviews",
    type: "Review Directory",
    url: "https://www.trustpilot.com/review/acme.com",
    status: "verified",
    itemsCount: 1240,
    lastSync: "10 mins ago",
    health: "100%",
  },
  {
    id: "src_2",
    name: "Google Business (Main HQ)",
    type: "Google Maps / Places",
    url: "https://maps.google.com/?cid=1029384756",
    status: "verified",
    itemsCount: 854,
    lastSync: "1 hour ago",
    health: "100%",
  },
  {
    id: "src_3",
    name: "G2 Crowd Software Reviews",
    type: "B2B Software Directory",
    url: "https://www.g2.com/products/acme/reviews",
    status: "pending_verification",
    itemsCount: 0,
    lastSync: "Never",
    health: "Pending",
  },
  {
    id: "src_4",
    name: "Reddit r/software Mentions",
    type: "Social Community",
    url: "https://reddit.com/r/software",
    status: "verified",
    itemsCount: 312,
    lastSync: "4 hours ago",
    health: "98%",
  },
];

export default function SourcesPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Data Sources & Review Channels
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Manage external touchpoints, review platforms, and feedback ingestion feeds.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" className="gap-1.5 text-xs bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900">
            <Plus className="h-3.5 w-3.5" />
            <span>Connect Source</span>
          </Button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <input
            type="search"
            placeholder="Filter sources by name or URL..."
            className="h-9 w-full rounded-md border border-zinc-200 bg-zinc-50 pl-9 pr-3 text-xs outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <Filter className="h-3.5 w-3.5" />
            <span>Filter Status</span>
          </Button>
        </div>
      </div>

      {/* Sources Grid / Table */}
      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50 font-medium text-zinc-500 dark:text-zinc-400">
            <tr>
              <th className="p-4">Source Name & Target</th>
              <th className="p-4">Type</th>
              <th className="p-4">Verification Status</th>
              <th className="p-4">Ingested Items</th>
              <th className="p-4">Last Sync</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {MOCK_SOURCES.map((source) => (
              <tr key={source.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors">
                <td className="p-4">
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {source.name}
                  </div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate max-w-xs flex items-center gap-1 mt-0.5">
                    <span>{source.url}</span>
                    <ExternalLink className="h-3 w-3 inline" />
                  </div>
                </td>
                <td className="p-4 text-zinc-600 dark:text-zinc-400 font-medium">
                  {source.type}
                </td>
                <td className="p-4">
                  {source.status === "verified" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" />
                      Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                      <Clock className="h-3 w-3" />
                      Pending Discovery
                    </span>
                  )}
                </td>
                <td className="p-4 font-mono font-medium text-zinc-900 dark:text-zinc-100">
                  {source.itemsCount.toLocaleString()} items
                </td>
                <td className="p-4 text-zinc-500 dark:text-zinc-400">
                  {source.lastSync}
                </td>
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
