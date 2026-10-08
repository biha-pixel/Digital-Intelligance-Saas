"use client";

import { useState } from "react";
import {
  StructuredEvidence,
  VerificationResult,
} from "@/lib/sources/types";
import { VerificationStatus, SourceOwnership } from "@/types/database.types";
import {
  updateSourceVerificationStatus,
  reverifyRegisteredSource,
} from "@/lib/actions/source-registry";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Globe,
  MapPin,
  Share2,
  FileCode,
  Layers,
  ArrowRight,
} from "lucide-react";

interface EvidenceInspectorProps {
  source: any;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function EvidenceInspector({
  source,
  isOpen,
  onClose,
  onUpdate,
}: EvidenceInspectorProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !source) return null;

  const evidence: StructuredEvidence =
    typeof source.metadata === "object" && source.metadata !== null
      ? (source.metadata as StructuredEvidence)
      : ({} as StructuredEvidence);

  const handleStatusUpdate = async (status: VerificationStatus) => {
    try {
      setLoading(true);
      setError(null);
      const res = await updateSourceVerificationStatus(
        source.id,
        status,
        `Manual status override to ${status}`
      );
      if (!res.success) {
        throw new Error(res.error || "Failed to update status");
      }
      onUpdate();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleReverify = async () => {
    try {
      setLoading(true);
      setError(null);
      // Construct a minimal context for reverification
      const context = {
        companyName: source.display_name?.split(" - ")[0] || "Company",
      };
      const res = await reverifyRegisteredSource(source.id, context);
      if (!res.success) {
        throw new Error(res.error || "Failed to reverify source");
      }
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 h-full shadow-2xl p-6 overflow-y-auto border-l border-slate-200 dark:border-slate-800 flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  {source.source_type}
                </span>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    source.ownership === "owned"
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      : source.ownership === "official"
                      ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                      : source.ownership === "third_party"
                      ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                  }`}
                >
                  {source.ownership?.replace("_", " ")}
                </span>
              </div>
              <h2 className="text-xl font-bold mt-2 text-slate-900 dark:text-white flex items-center gap-2">
                Evidence Inspector
              </h2>
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 mt-1 break-all"
              >
                {source.url}
                <ExternalLink className="h-3 w-3 inline shrink-0" />
              </a>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-500 text-xl font-bold p-1"
            >
              &times;
            </button>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-lg text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Verification Status & Confidence Score */}
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
              <span className="text-xs text-slate-500 font-medium">
                Verification Status
              </span>
              <div className="mt-1 flex items-center gap-2">
                {source.verification_status === "verified_auto" && (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                )}
                {source.verification_status === "verified_manual" && (
                  <ShieldCheck className="h-4 w-4 text-blue-500" />
                )}
                {source.verification_status === "unverified" && (
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                )}
                {source.verification_status === "rejected" && (
                  <XCircle className="h-4 w-4 text-rose-500" />
                )}
                <span className="text-sm font-semibold capitalize text-slate-900 dark:text-white">
                  {source.verification_status?.replace("_", " ")}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
              <span className="text-xs text-slate-500 font-medium">
                Confidence Score
              </span>
              <div className="mt-1 flex items-center gap-2">
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      (source.confidence_score || 0) >= 0.8
                        ? "bg-emerald-500"
                        : (source.confidence_score || 0) >= 0.5
                        ? "bg-amber-500"
                        : "bg-rose-500"
                    }`}
                    style={{
                      width: `${Math.round((source.confidence_score || 0) * 100)}%`,
                    }}
                  />
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {Math.round((source.confidence_score || 0) * 100)}%
                </span>
              </div>
            </div>
          </div>

          {/* Structured Evidence Checklist */}
          <div className="mt-6 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Layers className="h-4 w-4 text-slate-500" /> Multi-Factor Evidence Signals
            </h3>

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
              {/* Domain Match */}
              <div className="p-3 flex items-start gap-3 bg-white dark:bg-slate-900">
                <Globe className="h-4 w-4 text-slate-400 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Domain Matching
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        evidence.domainMatch?.matched
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                    >
                      {evidence.domainMatch?.matched ? "Matched" : "No Match"}
                    </span>
                  </div>
                  {evidence.domainMatch?.expectedDomain && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      Target: {evidence.domainMatch.expectedDomain} (Actual:{" "}
                      {evidence.domainMatch.actualDomain})
                    </p>
                  )}
                </div>
              </div>

              {/* Location Disambiguation */}
              <div className="p-3 flex items-start gap-3 bg-white dark:bg-slate-900">
                <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Geographic Location
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        evidence.locationMatch?.matched
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                    >
                      {evidence.locationMatch?.matched ? "Aligned" : "Neutral / Unmatched"}
                    </span>
                  </div>
                  {evidence.locationMatch?.detectedLocation && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      Detected: {evidence.locationMatch.detectedLocation}
                    </p>
                  )}
                </div>
              </div>

              {/* Social Profile */}
              <div className="p-3 flex items-start gap-3 bg-white dark:bg-slate-900">
                <Share2 className="h-4 w-4 text-slate-400 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Social Identity
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        evidence.socialMatch?.matched
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                    >
                      {evidence.socialMatch?.matched ? "Verified Handle" : "N/A"}
                    </span>
                  </div>
                  {evidence.socialMatch?.expectedHandle && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      Platform: {evidence.socialMatch.platform} (@
                      {evidence.socialMatch.expectedHandle})
                    </p>
                  )}
                </div>
              </div>

              {/* Schema.org */}
              <div className="p-3 flex items-start gap-3 bg-white dark:bg-slate-900">
                <FileCode className="h-4 w-4 text-slate-400 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Schema.org / JSON-LD
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        evidence.schemaOrg?.detected
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                    >
                      {evidence.schemaOrg?.detected ? "Detected" : "Not Found"}
                    </span>
                  </div>
                  {evidence.schemaOrg?.entityName && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      Entity: {evidence.schemaOrg.entityName}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Evaluated Signal Rules */}
          {evidence.signals && evidence.signals.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
                Evaluation Rationale
              </h3>
              <div className="space-y-2">
                {evidence.signals.map((sig, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/50 flex items-start justify-between text-xs"
                  >
                    <div className="pr-2">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {sig.name.replace(/_/g, " ")}
                      </span>
                      <p className="text-slate-500 mt-0.5">{sig.reason}</p>
                    </div>
                    <span
                      className={`font-mono font-bold shrink-0 ${
                        sig.matched ? "text-emerald-600" : "text-rose-500"
                      }`}
                    >
                      {sig.matched ? `+${sig.weight}` : `-${sig.weight}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Redirect Chain */}
          {evidence.redirectChain && evidence.redirectChain.length > 1 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
                Redirect Trace
              </h3>
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                {evidence.redirectChain.map((step, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="font-mono text-slate-400">{idx + 1}.</span>
                    <span className="font-mono truncate">{step}</span>
                    {idx < (evidence.redirectChain?.length || 0) - 1 && (
                      <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-6 mt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <button
            onClick={handleReverify}
            disabled={loading}
            className="px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Re-verify Engine
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleStatusUpdate("rejected")}
              disabled={loading}
              className="px-3 py-2 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 rounded-lg text-xs font-semibold hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors disabled:opacity-50"
            >
              Reject Source
            </button>
            <button
              onClick={() => handleStatusUpdate("verified_manual")}
              disabled={loading}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
            >
              Approve as Verified
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
