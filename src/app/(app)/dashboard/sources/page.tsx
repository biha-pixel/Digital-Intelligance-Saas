"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Search,
  ExternalLink,
  CheckCircle2,
  Clock,
  XCircle,
  Database,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getRegisteredSources } from "@/lib/actions/source-registry";
import { RegisteredSource } from "@/lib/sources/types";
import { AddSourceModal } from "@/components/sources/add-source-modal";
import { EvidenceInspector } from "@/components/sources/evidence-inspector";

export default function SourcesPage() {
  const [sources, setSources] = useState<RegisteredSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [inspectorSource, setInspectorSource] = useState<RegisteredSource | null>(null);

  const fetchSources = async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch all sources registered for the user's active organization
      const res = await getRegisteredSources();
      if (res.success && res.data) {
        setSources(res.data);
      } else {
        setError(res.error || "Failed to load sources");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified_auto":
      case "verified_manual":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            Verified
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700 dark:bg-rose-950/30 dark:text-rose-400">
            <XCircle className="h-3 w-3" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
            <Clock className="h-3 w-3" />
            Unverified
          </span>
        );
    }
  };

  const filteredSources = sources.filter((s) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      s.displayName.toLowerCase().includes(query) ||
      s.canonicalUrl.toLowerCase().includes(query) ||
      s.sourceType.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
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
          <Button
            size="sm"
            className="gap-1.5 text-xs bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Connect Source</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter sources by name, URL, or type..."
            className="h-9 w-full rounded-md border border-zinc-200 bg-zinc-50 pl-9 pr-3 text-xs outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
          />
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400 mx-auto mb-3" />
          <p className="text-xs text-zinc-500">Loading registered sources...</p>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-6 text-center dark:border-rose-900/50 dark:bg-rose-950/20">
          <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{error}</p>
        </div>
      ) : filteredSources.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-800 p-12 text-center bg-white dark:bg-zinc-900">
          <Database className="h-10 w-10 text-zinc-400 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            No Sources Registered
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
            Discover sources by running the pipeline from your dashboard or manually connect a new review channel.
          </p>
          <div className="mt-4">
            <Button
              size="sm"
              variant="outline"
              className="text-xs gap-1.5"
              onClick={() => setIsAddModalOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Connect Source</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50 font-medium text-zinc-500 dark:text-zinc-400">
              <tr>
                <th className="p-4">Source</th>
                <th className="p-4">Type</th>
                <th className="p-4">Verification</th>
                <th className="p-4">Confidence</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {filteredSources.map((source) => (
                <tr key={source.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="p-4">
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {source.displayName}
                    </div>
                    <a
                      href={source.canonicalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 mt-0.5"
                    >
                      {source.canonicalUrl}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </td>
                  <td className="p-4 text-zinc-600 dark:text-zinc-400">
                    {source.sourceSubtype?.replace("_", " ")}
                  </td>
                  <td className="p-4">
                    {getStatusBadge(source.verificationStatus)}
                  </td>
                  <td className="p-4 font-mono font-medium text-zinc-900 dark:text-zinc-100">
                    {Math.round(source.confidence * 100)}%
                  </td>
                  <td className="p-4 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => setInspectorSource(source)}
                    >
                      Inspect
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isAddModalOpen && (
        <AddSourceModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => {
            setIsAddModalOpen(false);
            fetchSources();
          }}
          companyProfileId="default-company-id"
        />
      )}

      {inspectorSource && (
        <EvidenceInspector
          isOpen={!!inspectorSource}
          source={inspectorSource}
          onClose={() => setInspectorSource(null)}
          onUpdate={() => {
            fetchSources();
          }}
        />
      )}
    </div>
  );
}
