import { NextResponse } from "next/server";
import { processNextJob } from "@/lib/queue/worker";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.INTERNAL_JOB_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const processed = await processNextJob();
    return NextResponse.json({
      message: processed ? "Job processed successfully" : "No jobs available",
      processed,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Job processing error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

