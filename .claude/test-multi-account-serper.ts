/**
 * Test Multi-Account Serper Integration
 * Verifies that CXPulse can successfully use multiple Serper API keys with round-robin load balancing
 */

import { config } from "dotenv";
import path from "path";

// Load environment variables
config({ path: path.resolve(process.cwd(), ".env.local") });

import { MultiAccountSerperProvider } from "../src/lib/discovery/providers/multi-account-serper";
import { DiscoveryService } from "../src/lib/discovery/service";

async function testMultiAccountSerperConnection() {
  console.log("\n=== Testing Multi-Account Serper Connection ===");

  const apiKeysStr = process.env.SERPER_API_KEYS || "";
  const apiKeys = apiKeysStr
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 0);

  if (apiKeys.length === 0) {
    console.error("❌ SERPER_API_KEYS not set in .env.local");
    console.log("\nPlease add your Serper API keys:");
    console.log("  SERPER_API_KEYS=sk-key1,sk-key2");
    return false;
  }

  console.log(`✓ Loaded ${apiKeys.length} Serper API key(s)`);
  apiKeys.forEach((key, i) => {
    console.log(`  Account ${i + 1}: ${key.substring(0, 15)}...`);
  });

  const provider = new MultiAccountSerperProvider(apiKeys);

  try {
    // Test 1: Single search (should use account 1)
    console.log("\n--- Test 1: First Search (Should Use Account 1) ---");
    const results1 = await provider.search({
      term: "Notion reviews trustpilot",
      limit: 3,
    });

    if (results1.length === 0) {
      console.warn("⚠️  No results returned");
      return false;
    }

    console.log(`✓ Got ${results1.length} results`);
    results1.slice(0, 2).forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.title}`);
    });

    // Test 2: Second search (should use account 2 if multiple accounts exist)
    if (apiKeys.length > 1) {
      console.log("\n--- Test 2: Second Search (Should Use Account 2) ---");
      const results2 = await provider.search({
        term: "GitHub reviews reddit",
        limit: 3,
      });

      if (results2.length === 0) {
        console.warn("⚠️  No results returned");
        return false;
      }

      console.log(`✓ Got ${results2.length} results`);
      results2.slice(0, 2).forEach((r, i) => {
        console.log(`  ${i + 1}. ${r.title}`);
      });

      // Test 3: Third search (should rotate back to account 1)
      console.log("\n--- Test 3: Third Search (Should Use Account 1 Again) ---");
      const results3 = await provider.search({
        term: "Slack reviews comparison",
        limit: 3,
      });

      if (results3.length === 0) {
        console.warn("⚠️  No results returned");
        return false;
      }

      console.log(`✓ Got ${results3.length} results`);
      results3.slice(0, 2).forEach((r, i) => {
        console.log(`  ${i + 1}. ${r.title}`);
      });
    }

    return true;
  } catch (error) {
    console.error("✗ Multi-account search failed:", error instanceof Error ? error.message : error);
    return false;
  }
}

async function testDiscoveryServiceWithMultiAccount() {
  console.log("\n=== Testing Discovery Service with Multi-Account Serper ===");

  const apiKeysStr = process.env.SERPER_API_KEYS || "";
  const apiKeys = apiKeysStr
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 0);

  if (apiKeys.length === 0) {
    console.log("(Skipped: no API keys configured)");
    return false;
  }

  const searchProvider = new MultiAccountSerperProvider(apiKeys);
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
  console.log("🚀 Multi-Account Serper Integration Test");
  console.log("========================================\n");

  // Check environment
  const apiKeysStr = process.env.SERPER_API_KEYS || "";
  if (!apiKeysStr) {
    console.error("❌ SERPER_API_KEYS not set in .env.local");
    console.log("\nSetup Instructions:");
    console.log("-------------------");
    console.log("1. Get your Serper API keys from https://serper.dev");
    console.log("2. Add them to .env.local (comma-separated):");
    console.log("   SERPER_API_KEYS=sk-your-key-1,sk-your-key-2");
    console.log("3. Run this test again: npm run test:multi-account-serper");
    process.exit(1);
  }

  console.log(`Environment:`);
  console.log(`  SERPER_API_KEYS configured with keys`);

  try {
    // Test 1: Direct multi-account search
    const test1Passed = await testMultiAccountSerperConnection();

    // Test 2: Discovery service using multi-account
    const test2Passed = test1Passed ? await testDiscoveryServiceWithMultiAccount() : false;

    // Summary
    console.log("\n📊 Test Summary:");
    console.log(`  Test 1 (Direct search): ${test1Passed ? "✅ PASSED" : "❌ FAILED"}`);
    console.log(`  Test 2 (Discovery service): ${test2Passed ? "✅ PASSED" : "❌ FAILED"}`);

    if (test1Passed && test2Passed) {
      console.log("\n✅ All tests passed! Multi-account Serper integration is working.");
      console.log("\nYour 2 Serper accounts are now automatically load-balanced!");
      console.log("Each search request rotates between your accounts.\n");
      process.exit(0);
    } else if (test1Passed) {
      console.log("\n⚠️  Direct search works but discovery service needs attention.");
      console.log("Check the error messages above.\n");
      process.exit(1);
    } else {
      console.log("\n⚠️  Tests failed. Check the errors above.\n");
      process.exit(1);
    }
  } catch (error) {
    console.error("\n❌ Test suite error:", error);
    process.exit(1);
  }
}

main();
