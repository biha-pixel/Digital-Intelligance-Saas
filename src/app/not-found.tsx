import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Compass, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[75vh] w-full flex-col items-center justify-center p-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 mb-6 shadow-sm">
        <Compass className="h-8 w-8 text-zinc-600 dark:text-zinc-400" />
      </div>

      <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
        404 Resource Not Found
      </span>

      <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
        Page does not exist
      </h1>

      <p className="mt-3 max-w-md text-sm text-zinc-600 dark:text-zinc-400">
        The route, intelligence view, or document you were looking for could not be located in this workspace.
      </p>

      <div className="mt-8 flex items-center gap-3">
        <Link href="/">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Go to Landing Page</span>
          </Button>
        </Link>
        <Link href="/dashboard">
          <Button className="gap-2">
            <Home className="h-4 w-4" />
            <span>Open Dashboard</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
