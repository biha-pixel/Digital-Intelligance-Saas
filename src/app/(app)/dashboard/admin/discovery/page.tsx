"use client";

import { useState } from "react";
import { Search, Globe, Shield, RefreshCw, AlertCircle, CheckCircle2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CandidateSource } from "@/lib/discovery/types";

export default function DiscoveryTestingPage() {
  const [companyName, setCompanyName] = useState("Acme Corp");
  const [domain, setDomain] = useState("acme.com");
  const [country, setCountry] = useState("US");
  const [industry, setIndustry] = useState("B2B SaaS & Software");
  const [city, setCity] = useState("San Francisco");
  const [providerType, setProviderType] = useState<"mock" | "serper">("mock");

  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<CandidateSource[] | null>(null);
  const [metrics, setMetrics] = useState<{ totalSearches: number; totalCandidates: number; deduplicatedCount: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRunDiscovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch("/api/discovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          domain,
          country,
          industry,
          locations: city ? [{ city, country }] : [],
          providerType,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Discovery run failed");
      }

      setResults(data.candidates);
      setMetrics(data.metrics);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run discovery");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
          <Search className="h-5 w-5 text-indigo-500" />
          Internal Discovery Engine Testing Lab
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Simulate and evaluate multi-query candidate source discovery, entity resolution, and confidence scoring algorithms.
        </p>
      </div>

      {/* Control Panel */}
      <form onSubmit={handleRunDiscovery} className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Company Name</label>
            <Input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Acme Corp"
              className="mt-1"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Primary Domain</label>
            <Input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="e.g. acme.com"
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Search Provider</label>
            <Select
              value={providerType}
              onChange={(e) => setProviderType(e.target.value as "mock" | "serper")}
              className="mt-1"
            >
              <option value="mock">Mock Search Provider (Deterministic)</option>
              <option value="serper">Serper API (Google Search Engine)</option>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Industry</label>
            <Input
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">City / Location</label>
            <Input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Country Code</label>
            <Input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={isLoading} className="gap-2">
            {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Run Discovery Pipeline
          </Button>
        </div>
      </form>

      {/* Error Alert */}
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-300 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Metrics Banner */}
      {metrics && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="text-[11px] text-zinc-400">Search Queries Fired</div>
            <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{metrics.totalSearches}</div>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="text-[11px] text-zinc-400">Total Raw Hits</div>
            <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{metrics.totalCandidates}</div>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="text-[11px] text-zinc-400">Canonicalized Sources</div>
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{metrics.deduplicatedCount}</div>
          </div>
        </div>
      )}

      {/* Discovered Candidates Table */}
      {results && (
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden dark:border-zinc-800 dark:bg-zinc-900">
          <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 font-semibold text-xs text-zinc-900 dark:text-zinc-100">
            Discovered Candidate Sources ({results.length})
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {results.map((candidate, idx) => (
              <div key={idx} className="p-4 space-y-2 hover:bg-zinc-50 dark:hover:bg-zinc-950/50 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 uppercase">
                      {candidate.sourceType}
                    </span>
                    <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      {candidate.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold">Confidence:</span>
                    <span
                      className={`text-xs font-bold ${
                        candidate.confidence >= 0.8
                          ? "text-emerald-600 dark:text-emerald-400"
                          : candidate.confidence >= 0.5
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {(candidate.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                <div className="text-[11px] font-mono text-zinc-500 break-all">
                  {candidate.normalizedUrl}
                </div>

                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <div>
                    <span className="font-semibold text-zinc-500">Reason:</span> {candidate.reason}
                  </div>
                  <div>
                    <span className="font-semibold text-zinc-500">Query:</span> {candidate.discoveredQuery}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
