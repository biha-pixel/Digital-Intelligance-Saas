/**
 * Test OmniRoute Serper Integration
 * Verifies that CXPulse can successfully search through OmniRoute's Serper connections
 */

import { config } from "dotenv";
import path from "path";

// Load environment variables
config({ path: path.resolve(process.cwd(), ".env.local") });

import { OmniRouteSerperProvider } from "../src/lib/discovery/providers/omniroute-serper";
import { DiscoveryService } from "../src/lib/discovery/service";

async function testOmniRouteSerperConnection() {
  console.log("\n=== Testing OmniRoute Serper Connection ===");

  const provider = new OmniRouteSerperProvider({
    baseUrl: process.env.OMNIROUTE_BASE_URL || "http://localhost:20128",
    apiKey: process.env.OMNIROUTE_API_KEY,
  });

  console.log(`Provider: ${provider.name}`);
  console.log(`OmniRoute URL: ${process.env.OMNIROUTE_BASE_URL || "http://localhost:20128"}`);

  try {
    // Test a simple search
    const results = await provider.search({
      term: "Notion reviews trustpilot",
      limit: 5,
    });

    if (results.length === 0) {
      console.warn("⚠️  No results returned from OmniRoute Serper");
      console.log(
        "Possible reasons:"
      );
      console.log("  1. OmniRoute not running (http://localhost:20128 not accessible)");
      console.log("  2. Serper connections not configured in OmniRoute");
      console.log("  3. OMNIROUTE_API_KEY not set in .env.local");
      return false;
    }

    console.log(`✓ Search successful! Got ${results.length} results:`);
    results.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.title}`);
      console.log(`     URL: ${r.url}`);
      console.log(`     Score: ${(r.relevanceScore * 100).toFixed(0)}%`);
    });

    return true;
  } catch (error) {
    console.error("✗ OmniRoute Serper search failed:", error instanceof Error ? error.message : error);
    return false;
  }
}

async function testDiscoveryServiceWithOmniRoute() {
  console.log("\n=== Testing Discovery Service with OmniRoute Serper ===");

  const searchProvider = new OmniRouteSerperProvider({
    baseUrl: process.env.OMNIROUTE_BASE_URL || "http://localhost:20128",
    apiKey: process.env.OMNIROUTE_API_KEY,
  });

  const discoveryService = new DiscoveryService(searchProvider);

  try {
    const result = await discoveryService.runDiscovery(
      "test-profile-123",
      {
        companyName: "Notion",
        domain: "notion.so",
        industry: "Productivity",
        country: "US",
        aliases: ["Notion App"],
        locations: [{ city: "San Francisco", country: "US" }],
      },
      { persist: false } // Don't persist to DB for this test
    );

    console.log(`✓ Discovery completed!`);
    console.log(`  - Queries executed: ${result.metrics.totalSearches}`);
    console.log(`  - Total candidates found: ${result.metrics.totalCandidates}`);
    console.log(`  - Deduplicated to: ${result.candidates.length} sources`);

    if (result.candidates.length > 0) {
      console.log(`\n  Top candidates:`);
      result.candidates.slice(0, 3).forEach((c, i) => {
        console.log(`    ${i + 1}. ${c.title}`);
        console.log(`       Type: ${c.sourceType}`);
        console.log(`       Confidence: ${(c.confidence * 100).toFixed(0)}%`);
      });
    }

    return result.candidates.length > 0;
  } catch (error) {
    console.error("✗ Discovery service failed:", error instanceof Error ? error.message : error);
    return false;
  }
}

async function main() {
  console.log("🚀 OmniRoute Serper Integration Test");
  console.log("====================================\n");

  // Check environment
  if (!process.env.OMNIROUTE_API_KEY) {
    console.error("❌ OMNIROUTE_API_KEY not set in .env.local");
    process.exit(1);
  }

  console.log(`Environment:`);
  console.log(`  OMNIROUTE_BASE_URL: ${process.env.OMNIROUTE_BASE_URL || "http://localhost:20128"}`);
  console.log(`  OMNIROUTE_API_KEY: ${process.env.OMNIROUTE_API_KEY.substring(0, 20)}...`);

  try {
    // Test 1: Direct OmniRoute Serper search
    const test1Passed = await testOmniRouteSerperConnection();

    // Test 2: Discovery service using OmniRoute
    const test2Passed = test1Passed ? await testDiscoveryServiceWithOmniRoute() : false;

    // Summary
    console.log("\n📊 Test Summary:");
    console.log(`  Test 1 (Direct search): ${test1Passed ? "✅ PASSED" : "❌ FAILED"}`);
    console.log(`  Test 2 (Discovery service): ${test2Passed ? "✅ PASSED" : "❌ FAILED"}`);

    if (test1Passed && test2Passed) {
      console.log("\n✅ All tests passed! OmniRoute Serper integration is working.");
      console.log("\nYour 2 Serper connections are now automatically load-balanced!");
      console.log("Each search request will rotate between your accounts.\n");
      process.exit(0);
    } else {
      console.log("\n⚠️  Some tests failed. Check the errors above.");
      process.exit(1);
    }
  } catch (error) {
    console.error("\n❌ Test suite error:", error);
    process.exit(1);
  }
}

main();
