"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RefreshCw, Play, CheckCircle2, AlertCircle } from "lucide-react";

export function PipelineTriggerButton() {
  const [isRunning, setIsRunning] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleRunPipeline = async () => {
    setIsRunning(true);
    setResultMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/pipeline/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          searchProviderType: "mock",
          scrapingProviderType: "crawl4ai",
          aiProviderType: "omniroute",
          sourceLimit: 3,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to execute pipeline");
      }

      const stats = data.summary?.stats;
      setResultMessage(
        `Pipeline complete: Discovered ${stats?.candidatesDiscovered || 0}, Verified ${stats?.sourcesVerified || 0}, Ingested ${stats?.feedbackItemsExtracted || 0}, Analyzed ${stats?.feedbackItemsAnalyzed || 0} reviews.`
      );
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to run pipeline");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        <Button
          onClick={handleRunPipeline}
          disabled={isRunning}
          size="sm"
          className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          {isRunning ? (
            <>
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              <span>Running End-to-End Pipeline...</span>
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Run Discovery & Ingestion Pipeline</span>
            </>
          )}
        </Button>
      </div>

      {resultMessage && (
        <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded border border-emerald-200 dark:border-emerald-800">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          <span>{resultMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 px-2.5 py-1 rounded border border-rose-200 dark:border-rose-800">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
