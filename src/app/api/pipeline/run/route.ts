import { NextRequest, NextResponse } from "next/server";
import { requireOrgAccess } from "@/lib/auth/session";
import { PipelineOrchestrator } from "@/lib/pipeline/pipeline-orchestrator";
import { SerperSearchProvider } from "@/lib/discovery/providers/serper";
import { MockSearchProvider } from "@/lib/discovery/providers/mock";

export async function POST(req: NextRequest) {
  try {
    const { org } = await requireOrgAccess("analyst");
    const body = await req.json().catch(() => ({}));

    const {
      companyProfileId,
      providerType = process.env.SEARCH_PROVIDER || "mock",
      sourceLimit = 5,
      skipCrawl = false,
      skipAnalysis = false,
      model,
    } = body;

    const searchProvider =
      providerType === "serper"
        ? new SerperSearchProvider()
        : new MockSearchProvider();

    const orchestrator = new PipelineOrchestrator({ searchProvider });

    const summary = await orchestrator.runFullPipeline(org.id, {
      companyProfileId,
      sourceLimit,
      skipCrawl,
      skipAnalysis,
      model,
    });

    if (summary.status === "failed") {
      return NextResponse.json(
        { success: false, error: summary.error, summary },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (err: any) {
    console.error("Pipeline execution API error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error executing pipeline" },
      { status: 500 }
    );
  }
}
