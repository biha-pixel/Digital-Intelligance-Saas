import { createAdminClient } from "@/lib/supabase/admin";
import { runScrapingPipeline } from "@/lib/scraping/pipeline";

interface ClaimedJob {
  id: string;
  organization_id: string;
  job_type: string;
  payload: Record<string, unknown>;
  attempts: number;
  max_attempts: number;
}

/**
 * Executes a job from the concurrent PostgreSQL-backed job queue.
 * DEADLOCK-SAFE: Uses SKIP LOCKED to allow concurrent worker execution.
 */
async function claimNextJob(): Promise<ClaimedJob | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("claim_next_job");

  if (error || !data) {
    return null;
  }

  const jobs = data as unknown as ClaimedJob[];
  return jobs.length > 0 ? jobs[0] : null;
}

async function markJobComplete(jobId: string) {
  const supabase = createAdminClient();
  await supabase
    .from("job_queue")
    .update({
      status: "COMPLETED",
      locked_at: null,
      locked_by: null
    })
    .eq("id", jobId);
}

async function markJobFailed(jobId: string, error: string, currentAttempts: number, maxAttempts: number) {
  const supabase = createAdminClient();
  const attempts = currentAttempts + 1;
  const status = attempts >= maxAttempts ? "FAILED" : "QUEUED";

  // Exponential backoff: 30s, 2m, 10m
  const backoffSeconds = Math.min(30 * Math.pow(4, currentAttempts), 600);
  const nextRunAt = new Date(Date.now() + backoffSeconds * 1000).toISOString();

  await supabase
    .from("job_queue")
    .update({
      status,
      attempts,
      locked_at: null,
      locked_by: null,
      last_error: error,
      next_run_at: nextRunAt,
    })
    .eq("id", jobId);
}

export async function processNextJob(): Promise<boolean> {
  const job = await claimNextJob();
  if (!job) return false;

  const supabase = createAdminClient();

  try {
    if (job.job_type === "SCRAPE_TARGET") {
      const sourceId = (job.payload as { sourceId?: string })?.sourceId;
      if (!sourceId) throw new Error("Job payload missing sourceId");

      const { data: source, error: sourceError } = await supabase
        .from("sources")
        .select("*")
        .eq("id", sourceId)
        .single();

      if (sourceError || !source) {
        throw new Error(`Source not found for ID: ${sourceId}`);
      }

      await runScrapingPipeline(
        job.organization_id,
        source.id,
        source.url,
        source.source_type
      );
    } else {
      throw new Error(`Unsupported job type: ${job.job_type}`);
    }

    await markJobComplete(job.id);
    return true;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Job ${job.id} failed:`, message);
    await markJobFailed(job.id, message, job.attempts, job.max_attempts);
    return true;
  }
}

export async function workerLoop(maxIterations?: number) {
  console.log("Starting worker loop...");
  let count = 0;
  while (maxIterations === undefined || count < maxIterations) {
    const processed = await processNextJob();
    if (!processed) {
      // No jobs available, wait before polling again
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
    count++;
  }
}
