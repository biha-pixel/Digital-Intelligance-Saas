"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to monitoring services securely
    console.error("Global Application Error Captured:", error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] w-full flex-col items-center justify-center p-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 mb-4">
        <AlertCircle className="h-7 w-7" />
      </div>

      <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        Something unexpected occurred
      </h2>

      <p className="mt-2 max-w-md text-sm text-zinc-600 dark:text-zinc-400">
        An unhandled error occurred while rendering the requested interface. Our system administrators have been alerted.
      </p>

      {error.digest && (
        <p className="mt-3 rounded bg-zinc-100 px-2 py-1 font-mono text-xs text-zinc-500 dark:bg-zinc-800">
          Error Digest: {error.digest}
        </p>
      )}

      <div className="mt-6 flex items-center gap-3">
        <Button onClick={() => reset()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          <span>Try Again</span>
        </Button>
        <Link href="/">
          <Button variant="outline" className="gap-2">
            <Home className="h-4 w-4" />
            <span>Return Home</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
