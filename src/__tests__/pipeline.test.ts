/**
 * End-to-End Pipeline Test with Crawl4AI
 * Tests: Discovery → Verification → Scraping → Extraction → AI Analysis
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from "vitest";
import { config } from "dotenv";
import path from "path";

// Load environment variables from .env.local
config({ path: path.resolve(process.cwd(), ".env.local") });

import { Crawl4AIProvider } from "@/lib/scraping/crawl4ai-client";
import { PipelineOrchestrator } from "@/lib/pipeline/pipeline-orchestrator";
import { MockSearchProvider } from "@/lib/discovery/providers/mock";
import { createAdminClient } from "@/lib/supabase/admin";

describe("End-to-End Pipeline with Crawl4AI", () => {
  let provider: Crawl4AIProvider;
  let supabase: ReturnType<typeof createAdminClient>;
  let orgId: string;
  let companyProfileId: string;

  beforeAll(async () => {
    // Initialize Crawl4AI provider
    provider = new Crawl4AIProvider({
      baseUrl: process.env.CRAWL4AI_SERVICE_URL || "http://localhost:11235",
      apiToken: process.env.CRAWL4AI_API_TOKEN,
    });

    // Check Crawl4AI health
    const health = await provider.healthCheck();
    console.log("Crawl4AI Health:", health);

    // Initialize Supabase
    supabase = createAdminClient();

    // Get or create test organization
    const { data: orgs } = await supabase
      .from("organizations")
      .select("id")
      .limit(1);

    if (!orgs || orgs.length === 0) {
      throw new Error("No organizations found. Please create one first.");
    }

    orgId = orgs[0].id;
    console.log(`Using organization: ${orgId}`);

    // Get test company profile
    const { data: profiles } = await supabase
      .from("company_profiles")
      .select("id")
      .eq("organization_id", orgId)
      .limit(1);

    if (!profiles || profiles.length === 0) {
      throw new Error("No company profiles found. Please create one first.");
    }

    companyProfileId = profiles[0].id;
    console.log(`Using company profile: ${companyProfileId}`);
  });

  it("should connect to Crawl4AI successfully", async () => {
    const health = await provider.healthCheck();
    expect(health.healthy).toBe(true);
  }, 10000);

  it("should scrape a single page successfully", async () => {
    const testUrl = "https://www.notion.so";
    console.log(`Scraping: ${testUrl}`);

    const result = await provider.fetch({
      url: testUrl,
      timeoutMs: 30000,
    });

    expect(result.url).toBeDefined();
    expect([200, 301, 302, 307, 308]).toContain(result.statusCode);
    expect(result.html).toBeDefined();
    expect(result.html.length).toBeGreaterThan(0);
    expect(result.metadata.contentLength).toBeGreaterThan(0);
    console.log("✓ Scrape successful!");
    console.log(`  - URL: ${result.url}`);
    console.log(`  - Status: ${result.statusCode}`);
    console.log(`  - Content length: ${result.metadata.contentLength} bytes`);
    console.log(`  - Execution time: ${result.executionTimeMs}ms`);
  }, 30000);

  it("should run the full pipeline successfully", async () => {
    // Create orchestrator with Crawl4AI
    const orchestrator = new PipelineOrchestrator({
      searchProvider: new MockSearchProvider(),
      scrapingProvider: provider,
    });

    // Run pipeline
    console.log("Starting pipeline execution...");
    const summary = await orchestrator.runFullPipeline(orgId, {
      companyProfileId,
      sourceLimit: 2, // Limit to 2 sources for quick testing
      skipAnalysis: false,
    });

    console.log("✓ Pipeline completed!");
    console.log(`  - Status: ${summary.status}`);
    console.log(`  - Candidates discovered: ${summary.stats.candidatesDiscovered}`);
    console.log(`  - Sources verified: ${summary.stats.sourcesVerified}`);
    console.log(`  - Sources ingested: ${summary.stats.sourcesIngested}`);
    console.log(`  - Feedback items extracted: ${summary.stats.feedbackItemsExtracted}`);
    console.log(`  - Feedback items analyzed: ${summary.stats.feedbackItemsAnalyzed}`);
    console.log(`  - Duration: ${summary.stats.durationMs}ms`);

    expect(summary.status).toBe("completed");
    expect(summary.stats.candidatesDiscovered).toBeGreaterThan(0);
    expect(summary.stats.sourcesVerified).toBeGreaterThan(0);
    expect(summary.stats.feedbackItemsExtracted).toBeGreaterThanOrEqual(0);
  }, 120000);
});