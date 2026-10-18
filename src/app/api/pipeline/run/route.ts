import { NextRequest, NextResponse } from "next/server";
import { requireOrgAccess } from "@/lib/auth/session";
import { PipelineOrchestrator } from "@/lib/pipeline/pipeline-orchestrator";
import { SerperSearchProvider } from "@/lib/discovery/providers/serper";
import { MockSearchProvider } from "@/lib/discovery/providers/mock";
import { getScrapingProvider } from "@/lib/scraping/provider";

export async function POST(req: NextRequest) {
  try {
    const { org } = await requireOrgAccess("analyst");
    const body = await req.json().catch(() => ({}));

    const {
      companyProfileId,
      searchProviderType = process.env.SEARCH_PROVIDER || "mock",
      scrapingProviderType = process.env.SCRAPING_PROVIDER || "crawl4ai",
      aiProviderType = "omniroute",
      sourceLimit = 5,
      skipCrawl = false,
      skipAnalysis = false,
      model,
    } = body;

    // Use legacy `providerType` param as a fallback for search if `searchProviderType` is default "mock"
    // (Helps avoid breaking older frontend clients during migration)
    const activeSearchProviderType = body.providerType && (body.providerType === "serper" || body.providerType === "mock")
      ? body.providerType
      : searchProviderType;

    const searchProvider =
      activeSearchProviderType === "serper"
        ? new SerperSearchProvider()
        : new MockSearchProvider();

    const scrapingProvider = getScrapingProvider({ providerType: scrapingProviderType });

    const orchestrator = new PipelineOrchestrator({ searchProvider, scrapingProvider });

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
