"use client";

import { useState } from "react";
import {
  VerificationContext,
  VerificationResult,
} from "@/lib/sources/types";
import { registerCandidateSource } from "@/lib/actions/source-registry";
import {
  Plus,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";

interface AddSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  companyProfileId: string;
  defaultContext?: VerificationContext;
}

export function AddSourceModal({
  isOpen,
  onClose,
  onSuccess,
  companyProfileId,
  defaultContext,
}: AddSourceModalProps) {
  const [url, setUrl] = useState("");
  const [companyName, setCompanyName] = useState(
    defaultContext?.companyName || ""
  );
  const [primaryDomain, setPrimaryDomain] = useState(
    defaultContext?.primaryDomain || ""
  );
  const [locationCity, setLocationCity] = useState(
    defaultContext?.locations?.[0]?.city || ""
  );
  const [locationCountry, setLocationCountry] = useState(
    defaultContext?.locations?.[0]?.country || ""
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] =
    useState<VerificationResult | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    try {
      setLoading(true);
      setError(null);
      setVerificationResult(null);

      const context: VerificationContext = {
        companyName: companyName.trim() || "Target Entity",
        primaryDomain: primaryDomain.trim() || undefined,
        locations:
          locationCity || locationCountry
            ? [{ city: locationCity.trim(), country: locationCountry.trim() }]
            : undefined,
      };

      const res = await registerCandidateSource(companyProfileId, url, context);

      if (!res.success || !res.data) {
        throw new Error(res.error || "Failed to register candidate source");
      }

      setVerificationResult(res.data.verification);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-xl w-full p-6 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Connect & Verify Candidate Source
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Multi-factor verification will evaluate authenticity, taxonomy, and ownership.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-500 text-xl font-bold p-1"
          >
            &times;
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-lg text-xs text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {verificationResult ? (
          <div className="mt-6 space-y-4">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
              <div className="flex items-center gap-2">
                {verificationResult.verificationStatus === "verified_auto" ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : verificationResult.verificationStatus === "rejected" ? (
                  <ShieldAlert className="h-5 w-5 text-rose-500" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                )}
                <span className="font-semibold text-sm capitalize text-slate-900 dark:text-white">
                  {verificationResult.verificationStatus.replace("_", " ")}
                </span>
                <span className="text-xs text-slate-400 ml-auto font-mono">
                  Confidence: {Math.round(verificationResult.confidence * 100)}%
                </span>
              </div>

              <div className="mt-3 text-xs space-y-1 text-slate-600 dark:text-slate-300">
                <p>
                  <strong>Canonical URL:</strong> {verificationResult.canonicalUrl}
                </p>
                <p>
                  <strong>Ownership Taxonomy:</strong>{" "}
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {verificationResult.ownership}
                  </span>
                </p>
                <p>
                  <strong>Source Subtype:</strong>{" "}
                  {verificationResult.sourceSubtype.replace(/_/g, " ")}
                </p>
                <p>
                  <strong>Evaluation Reason:</strong>{" "}
                  {verificationResult.summaryReason}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setVerificationResult(null);
                  setUrl("");
                }}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Add Another
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Candidate Source URL *
              </label>
              <input
                type="url"
                required
                placeholder="https://trustpilot.com/review/example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Target Company Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Acme Inc"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Primary Domain
                </label>
                <input
                  type="text"
                  placeholder="e.g. acme.com"
                  value={primaryDomain}
                  onChange={(e) => setPrimaryDomain(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Branch / HQ City
                </label>
                <input
                  type="text"
                  placeholder="e.g. San Francisco"
                  value={locationCity}
                  onChange={(e) => setLocationCity(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Country
                </label>
                <input
                  type="text"
                  placeholder="e.g. United States"
                  value={locationCountry}
                  onChange={(e) => setLocationCountry(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Verifying Source...
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" />
                    Verify & Register Source
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
