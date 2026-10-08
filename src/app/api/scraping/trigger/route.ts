import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const { sourceId, organizationId } = await req.json();

  if (!sourceId || !organizationId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabase = await createClient();

  // Enqueue job
  const { error } = await supabase.from("job_queue").insert({
    organization_id: organizationId,
    job_type: "SCRAPE_TARGET",
    payload: { sourceId },
    status: "QUEUED",
    next_run_at: new Date().toISOString(),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Job enqueued" });
}
