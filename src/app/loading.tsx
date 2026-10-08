export default function GlobalLoading() {
  return (
    <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-4 p-8">
      <div className="relative flex h-12 w-12 items-center justify-center">
        <div className="absolute h-full w-full rounded-full border-4 border-zinc-200 border-t-zinc-900 animate-spin dark:border-zinc-800 dark:border-t-zinc-50" />
      </div>
      <div className="flex flex-col items-center gap-1 text-center">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Loading intelligence data...
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Connecting to customer stream and preparing workspace
        </p>
      </div>
    </div>
  );
}
