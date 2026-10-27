/**
 * Test Platform-Specific Scraping with Real URLs
 *
 * This script tests the platform-specific scraping configurations
 * to verify that extractors can properly identify and extract reviews.
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local") });

import { Crawl4AIProvider } from "@/lib/scraping/crawl4ai-client";
import { getPlatformConfig } from "@/lib/scraping/platform-configs";
import { ExtractorRegistry } from "@/lib/scraping/extractors";
import { SourceType } from "@/types/database.types";

interface TestCase {
  sourceType: SourceType;
  url: string;
  expectedMinReviews: number;
  description: string;
}

const TEST_CASES: TestCase[] = [
  {
    sourceType: "trustpilot",
    url: "https://www.trustpilot.com/review/tatamotors.com",
    expectedMinReviews: 5,
    description: "Tata Motors Trustpilot reviews",
  },
  {
    sourceType: "reddit",
    url: "https://www.reddit.com/r/CarsIndia/comments/1ry3n6d/honest_tata_ownership_review/",
    expectedMinReviews: 1,
    description: "Reddit thread about Tata Motors ownership",
  },
];

async function testPlatformScraping() {
  console.log("\n=== Platform-Specific Scraping Test ===\n");
  console.log("Testing Crawl4AI with platform-specific configurations...\n");

  const provider = new Crawl4AIProvider();
  const registry = ExtractorRegistry.getInstance();

  // Health check first
  console.log("🏥 Checking Crawl4AI health...");
  const health = await provider.healthCheck();

  if (!health.healthy) {
    console.error(`❌ Crawl4AI is not healthy: ${health.message}`);
    console.error(`   Make sure Crawl4AI server is running at: ${process.env.CRAWL4AI_BASE_URL || "http://localhost:11235"}`);
    process.exit(1);
  }

  console.log(`✅ Crawl4AI is healthy (${health.latencyMs}ms)\n`);

  let passedTests = 0;
  let failedTests = 0;

  for (const testCase of TEST_CASES) {
    console.log(`\n${"=".repeat(80)}`);
    console.log(`📝 Test: ${testCase.description}`);
    console.log(`   Type: ${testCase.sourceType}`);
    console.log(`   URL: ${testCase.url}`);
    console.log(`${"=".repeat(80)}\n`);

    try {
      // Get platform config
      const config = getPlatformConfig(testCase.sourceType);
      console.log(`⚙️  Platform Config:`);
      console.log(`   - Wait for selector: ${config.waitForSelector || "none"}`);
      console.log(`   - Delay: ${config.delayMs}ms`);
      console.log(`   - JS enabled: ${config.jsEnabled}`);
      console.log(`   - Timeout: ${config.timeoutMs}ms`);
      console.log(`   - Description: ${config.description}\n`);

      // Fetch with Crawl4AI
      console.log(`🌐 Fetching page...`);
      const startFetch = Date.now();

      const scrapeResult = await provider.fetch({
        url: testCase.url,
        waitForSelector: config.waitForSelector,
        delayMs: config.delayMs,
        timeoutMs: config.timeoutMs,
        headers: config.headers,
        bypassCache: true,
      });

      const fetchDuration = Date.now() - startFetch;
      console.log(`✅ Fetched in ${fetchDuration}ms`);
      console.log(`   - Status: ${scrapeResult.statusCode}`);
      console.log(`   - HTML size: ${scrapeResult.html.length} bytes`);
      console.log(`   - Text size: ${scrapeResult.text.length} bytes`);
      console.log(`   - Final URL: ${scrapeResult.url}\n`);

      // Check for redirects
      if (scrapeResult.url !== testCase.url) {
        console.warn(`⚠️  Redirect detected:`);
        console.warn(`   From: ${testCase.url}`);
        console.warn(`   To:   ${scrapeResult.url}\n`);
      }

      // Extract reviews
      console.log(`🔍 Extracting reviews with ${testCase.sourceType} extractor...`);
      const extractor = registry.get(testCase.sourceType);
      const startExtract = Date.now();

      const extractionResult = extractor.extract(scrapeResult.html, scrapeResult.url);

      const extractDuration = Date.now() - startExtract;
      console.log(`✅ Extraction completed in ${extractDuration}ms`);
      console.log(`   - Source type: ${extractionResult.sourceType}`);
      console.log(`   - Items extracted: ${extractionResult.totalExtracted}`);
      console.log(`   - Page title: ${extractionResult.pageTitle || "N/A"}\n`);

      // Show first few items
      if (extractionResult.items.length > 0) {
        console.log(`📄 Sample extracted items:\n`);
        extractionResult.items.slice(0, 3).forEach((item, idx) => {
          console.log(`   ${idx + 1}. Author: ${item.authorDisplayName || "Anonymous"}`);
          console.log(`      Rating: ${item.rating || "N/A"}`);
          console.log(`      Type: ${item.feedbackType}`);
          console.log(`      Content: ${item.contentText.substring(0, 100)}...`);
          console.log(`      Posted: ${item.postedAt || "N/A"}\n`);
        });
      } else {
        console.log(`❌ No items extracted!\n`);
        console.log(`🔍 Debugging info:`);
        console.log(`   - HTML preview (first 500 chars):`);
        console.log(`     ${scrapeResult.html.substring(0, 500)}\n`);
      }

      // Validate results
      const success = extractionResult.totalExtracted >= testCase.expectedMinReviews;

      if (success) {
        console.log(`✅ TEST PASSED: Extracted ${extractionResult.totalExtracted} items (expected ≥${testCase.expectedMinReviews})`);
        passedTests++;
      } else {
        console.log(`❌ TEST FAILED: Only extracted ${extractionResult.totalExtracted} items (expected ≥${testCase.expectedMinReviews})`);
        failedTests++;
      }

    } catch (error: any) {
      console.error(`❌ TEST ERROR: ${error.message}`);
      console.error(`   Stack: ${error.stack}\n`);
      failedTests++;
    }
  }

  // Summary
  console.log(`\n${"=".repeat(80)}`);
  console.log(`📊 Test Summary`);
  console.log(`${"=".repeat(80)}`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📈 Total:  ${passedTests + failedTests}`);
  console.log(`${"=".repeat(80)}\n`);

  if (failedTests > 0) {
    console.log(`⚠️  Some tests failed. Check the output above for details.\n`);
    process.exit(1);
  } else {
    console.log(`🎉 All tests passed!\n`);
  }
}

// Run tests
testPlatformScraping().catch((error) => {
  console.error("\n❌ Fatal error:", error);
  process.exit(1);
});
