/**
 * End-to-End Pipeline Test with Crawl4AI
 * Tests: Discovery → Verification → Scraping → Extraction → AI Analysis
 */

import { config } from "dotenv";
import path from "path";

// Load environment variables from .env.local
config({ path: path.resolve(process.cwd(), ".env.local") });

import { Crawl4AIProvider } from "../src/lib/scraping/crawl4ai-client.ts";
import { PipelineOrchestrator } from "../src/lib/pipeline/pipeline-orchestrator.ts";
import { MockSearchProvider } from "../src/lib/discovery/providers/mock.ts";
import { createAdminClient } from "../src/lib/supabase/admin.ts";

async function testCrawl4AIConnection() {
  console.log("\n=== Testing Crawl4AI Connection ===");
  const provider = new Crawl4AIProvider({
    baseUrl: process.env.CRAWL4AI_SERVICE_URL || "http://localhost:11235",
    apiToken: process.env.CRAWL4AI_API_TOKEN,
  });

  const health = await provider.healthCheck();
  console.log("✓ Crawl4AI Health:", health);

  if (!health.healthy) {
    throw new Error("Crawl4AI is not healthy");
  }

  return provider;
}

async function testSinglePageScrape(provider: Crawl4AIProvider) {
  console.log("\n=== Testing Single Page Scrape ===");

  const testUrl = "https://www.notion.so";
  console.log(`Scraping: ${testUrl}`);

  try {
    const result = await provider.fetch({
      url: testUrl,
      timeoutMs: 30000,
    });

    console.log("✓ Scrape successful!");
    console.log(`  - URL: ${result.url}`);
    console.log(`  - Status: ${result.statusCode}`);
    console.log(`  - Content length: ${result.metadata.contentLength} bytes`);
    console.log(`  - Execution time: ${result.executionTimeMs}ms`);
    console.log(`  - HTML: ${result.html.slice(0, 100)}...`);

    return result;
  } catch (error) {
    console.error("✗ Scrape failed:", error instanceof Error ? error.message : error);
    throw error;
  }
}

async function testFullPipeline() {
  console.log("\n=== Testing Full Pipeline ===");

  const supabase = createAdminClient();

  // Get or create test organization
  const { data: orgs } = await supabase
    .from("organizations")
    .select("id")
    .limit(1);

  if (!orgs || orgs.length === 0) {
    throw new Error("No organizations found. Please create one first.");
  }

  const orgId = orgs[0].id;
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

  const companyProfileId = profiles[0].id;
  console.log(`Using company profile: ${companyProfileId}`);

  // Create orchestrator with Crawl4AI
  const provider = new Crawl4AIProvider({
    baseUrl: process.env.CRAWL4AI_SERVICE_URL || "http://localhost:11235",
    apiToken: process.env.CRAWL4AI_API_TOKEN,
  });

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

  console.log("\n✓ Pipeline completed!");
  console.log(`  - Status: ${summary.status}`);
  console.log(`  - Candidates discovered: ${summary.stats.candidatesDiscovered}`);
  console.log(`  - Sources verified: ${summary.stats.sourcesVerified}`);
  console.log(`  - Sources ingested: ${summary.stats.sourcesIngested}`);
  console.log(`  - Feedback items extracted: ${summary.stats.feedbackItemsExtracted}`);
  console.log(`  - Feedback items analyzed: ${summary.stats.feedbackItemsAnalyzed}`);
  console.log(`  - Duration: ${summary.stats.durationMs}ms`);

  if (summary.error) {
    console.error(`  - Error: ${summary.error}`);
  }

  return summary;
}

async function main() {
  try {
    console.log("🚀 Starting End-to-End Pipeline Test with Crawl4AI");
    console.log("================================================");

    // Test 1: Crawl4AI connection
    const provider = await testCrawl4AIConnection();

    // Test 2: Single page scrape
    await testSinglePageScrape(provider);

    // Test 3: Full pipeline
    await testFullPipeline();

    console.log("\n✅ All tests passed!");
  } catch (error) {
    console.error("\n❌ Test failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
