import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  let dbStatus = "unknown";

  try {
    const { error } = await supabase.from('organizations').select('id').limit(1);
    dbStatus = error ? "degraded" : "operational";
  } catch (err) {
    dbStatus = "down";
  }

  let crawl4aiStatus = "unknown";
  try {
    const res = await fetch(`${process.env.CRAWL4AI_ENDPOINT || 'http://localhost:11235'}/health`, {
      method: "GET",
      // Short timeout for health check
      signal: AbortSignal.timeout(2000)
    });
    crawl4aiStatus = res.ok ? "operational" : "degraded";
  } catch (err) {
    crawl4aiStatus = "down";
  }

  const healthData = {
    status: (dbStatus === "operational" && crawl4aiStatus === "operational") ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    service: "digital-intelligence-saas",
    environment: process.env.NODE_ENV || "development",
    version: "0.1.0",
    checks: {
      web_layer: "operational",
      app_router: "operational",
      ai_gateway: {
        provider: "OmniRoute",
        status: "ready_for_configuration",
      },
      database: {
        provider: "Supabase (RLS)",
        status: dbStatus,
      },
      scraping_engine: {
        provider: "Crawl4AI",
        status: crawl4aiStatus,
      },
    },
  };

  return NextResponse.json(healthData, {
    status: healthData.status === "healthy" ? 200 : 503,
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
