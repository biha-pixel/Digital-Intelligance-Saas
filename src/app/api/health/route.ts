import { NextResponse } from "next/server";

export async function GET() {
  const healthData = {
    status: "healthy",
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
        status: "pending_phase_3_integration",
      },
      scraping_engine: {
        provider: "Crawl4AI",
        status: "pending_pipeline_integration",
      },
    },
  };

  return NextResponse.json(healthData, {
    status: 200,
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
