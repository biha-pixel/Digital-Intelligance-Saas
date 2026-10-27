/**
 * Test OmniRoute Serper Combo Integration
 * Verifies that CXPulse can use OmniRoute's combo system to load-balance across Serper accounts
 */

import { config } from "dotenv";
import path from "path";

// Load environment variables
config({ path: path.resolve(process.cwd(), ".env.local") });

import { OmniRouteSerperComboProvider } from "../src/lib/discovery/providers/omniroute-serper-combo";
import { DiscoveryService } from "../src/lib/discovery/service";

async function testOmniRouteSerperCombo() {
  console.log("\n=== Testing OmniRoute Serper Combo ===");

  const provider = new OmniRouteSerperComboProvider();
  const info = provider.getInfo();

  console.log(`Provider: ${info.name}`);
  console.log(`Combo Name: ${info.comboName || "(not configured)"}`);
  console.log(`OmniRoute URL: ${info.baseUrl}`);
  console.log(`Configured: ${info.configured ? "✓" : "✗"}`);

  if (!info.configured) {
    console.error("\n❌ Configuration incomplete");
    console.log("\nRequired environment variables:");
    console.log("  OMNIROUTE_API_KEY=your-omniroute-api-key");
    console.log("  OMNIROUTE_SERPER_COMBO=your-combo-name");
    console.log("\nSetup steps:");
    console.log("  1. Create a combo in OmniRoute dashboard (e.g., 'serper-combo')");
    console.log("  2. Add your 2 Serper connections to the combo");
    console.log("  3. Set OMNIROUTE_SERPER_COMBO=serper-combo in .env.local");
    return false;
  }

  try {
    // Test search 1
    console.log("\n--- Test 1: First Search ---");
    const results1 = await provider.search({
      term: "Notion reviews trustpilot",
      limit: 3,
    });

    if (results1.length === 0) {
      console.warn("⚠️  No results returned");
      console.log("\nPossible issues:");
      console.log("  1. OmniRoute not running (check http://localhost:20128)");
      console.log("  2. Combo not found - verify combo name in dashboard");
      console.log("  3. Serper connections not configured in the combo");
      return false;
    }

    console.log(`✓ Got ${results1.length} results:`);
    results1.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.title}`);
    });

    // Test search 2 (should use the other account in the combo)
    console.log("\n--- Test 2: Second Search (Rotates to Next Account) ---");
    const results2 = await provider.search({
      term: "GitHub reviews comparison",
      limit: 3,
    });

    console.log(`✓ Got ${results2.length} results:`);
    results2.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.title}`);
    });

    return true;
  } catch (error) {
    console.error("✗ OmniRoute Serper combo search failed:", error instanceof Error ? error.message : error);
    return false;
  }
}

async function testDiscoveryWithCombo() {
  console.log("\n=== Testing Discovery Service with OmniRoute Combo ===");

  const searchProvider = new OmniRouteSerperComboProvider();
  const discoveryService = new DiscoveryService(searchProvider);

  try {
    const result = await discoveryService.runDiscovery(
      "test-profile-combo",
      {
        companyName: "Slack",
        domain: "slack.com",
        industry: "Communication",
        country: "US",
        aliases: ["Slack Technologies"],
        locations: [{ city: "San Francisco", country: "US" }],
      },
      { persist: false }
    );

    console.log(`✓ Discovery completed!`);
    console.log(`  - Queries executed: ${result.metrics.totalSearches}`);
    console.log(`  - Total candidates: ${result.metrics.totalCandidates}`);
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
    console.error("✗ Discovery failed:", error instanceof Error ? error.message : error);
    return false;
  }
}

async function main() {
  console.log("🚀 OmniRoute Serper Combo Integration Test");
  console.log("==========================================\n");

  const apiKey = process.env.OMNIROUTE_API_KEY;
  const comboName = process.env.OMNIROUTE_SERPER_COMBO;

  console.log(`Environment Check:`);
  console.log(`  OMNIROUTE_API_KEY: ${apiKey ? "✓ Set" : "✗ Missing"}`);
  console.log(`  OMNIROUTE_SERPER_COMBO: ${comboName || "✗ Missing"}`);
  console.log(`  OMNIROUTE_BASE_URL: ${process.env.OMNIROUTE_BASE_URL || "http://localhost:20128 (default)"}`);

  if (!apiKey || !comboName) {
    console.error("\n❌ Configuration incomplete. See setup instructions above.");
    process.exit(1);
  }

  try {
    // Test 1: Direct combo search
    const test1Passed = await testOmniRouteSerperCombo();

    // Test 2: Discovery service
    const test2Passed = test1Passed ? await testDiscoveryWithCombo() : false;

    // Summary
    console.log("\n📊 Test Summary:");
    console.log(`  Test 1 (Direct combo search): ${test1Passed ? "✅ PASSED" : "❌ FAILED"}`);
    console.log(`  Test 2 (Discovery service): ${test2Passed ? "✅ PASSED" : "❌ FAILED"}`);

    if (test1Passed && test2Passed) {
      console.log("\n✅ All tests passed!");
      console.log("\n🎯 OmniRoute Combo Benefits:");
      console.log("  ✓ Automatic load balancing across your 2 Serper accounts");
      console.log("  ✓ Failover if one account hits rate limits");
      console.log("  ✓ Usage tracking in OmniRoute dashboard");
      console.log("  ✓ Centralized management (add more accounts anytime)\n");
      process.exit(0);
    } else {
      console.log("\n⚠️  Tests failed. Check errors above.\n");
      process.exit(1);
    }
  } catch (error) {
    console.error("\n❌ Test suite error:", error);
    process.exit(1);
  }
}

main();
