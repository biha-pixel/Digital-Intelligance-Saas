/**
 * Test Discovery with Fixed Reddit Confidence Scoring
 */

import { config } from "dotenv";
import path from "path";

config({ path: path.resolve(process.cwd(), ".env.local") });

import { MultiAccountSerperProvider } from "../src/lib/discovery/providers/multi-account-serper";
import { DiscoveryService } from "../src/lib/discovery/service";

async function main() {
  console.log("🔍 Testing Discovery with Reddit Support");
  console.log("========================================\n");

  const apiKeysStr = process.env.SERPER_API_KEYS || "";
  const apiKeys = apiKeysStr.split(",").map(k => k.trim()).filter(k => k.length > 0);

  const searchProvider = new MultiAccountSerperProvider(apiKeys);
  const discoveryService = new DiscoveryService(searchProvider);

  // Test with Notion (American company)
  console.log("Company: Notion\n");

  const result = await discoveryService.runDiscovery(
    "test-reddit-discovery",
    {
      companyName: "Notion",
      domain: "notion.so",
      industry: "Productivity",
      country: "US",
      aliases: ["Notion App"],
      locations: [{ city: "San Francisco", country: "US" }],
    },
    { persist: false }
  );

  console.log(`Total sources found: ${result.candidates.length}\n`);

  // Group by source type
  const byType = result.candidates.reduce((acc, c) => {
    acc[c.sourceType] = acc[c.sourceType] || [];
    acc[c.sourceType].push(c);
    return acc;
  }, {} as Record<string, typeof result.candidates>);

  console.log("Sources by type:");
  Object.keys(byType).sort().forEach(type => {
    const sources = byType[type];
    const verified = sources.filter(s => s.verificationStatus === "verified_auto").length;
    const unverified = sources.filter(s => s.verificationStatus === "unverified").length;
    const rejected = sources.filter(s => s.verificationStatus === "rejected").length;

    console.log(`  ${type}: ${sources.length} total`);
    console.log(`    ✅ Verified: ${verified}`);
    console.log(`    ⏳ Unverified: ${unverified}`);
    console.log(`    ❌ Rejected: ${rejected}`);
  });

  // Show Reddit sources specifically
  console.log("\n📱 Reddit Sources:");
  const redditSources = result.candidates.filter(c => c.sourceType === "reddit");

  if (redditSources.length === 0) {
    console.log("  No Reddit sources found");
  } else {
    redditSources.forEach((s, i) => {
      console.log(`  ${i + 1}. ${s.title}`);
      console.log(`     URL: ${s.url}`);
      console.log(`     Confidence: ${(s.confidence * 100).toFixed(0)}%`);
      console.log(`     Status: ${s.verificationStatus}`);
      console.log(`     Reason: ${s.reason}`);
      console.log();
    });
  }

  // Summary
  const verifiedCount = result.candidates.filter(s => s.verificationStatus === "verified_auto").length;
  const unverifiedCount = result.candidates.filter(s => s.verificationStatus === "unverified").length;
  const rejectedCount = result.candidates.filter(s => s.verificationStatus === "rejected").length;

  console.log("=" .repeat(50));
  console.log("📊 Summary:");
  console.log(`  ✅ Auto-verified (will be scraped): ${verifiedCount}`);
  console.log(`  ⏳ Unverified (needs manual review): ${unverifiedCount}`);
  console.log(`  ❌ Rejected (filtered out): ${rejectedCount}`);
  console.log();

  const redditVerified = redditSources.filter(s => s.verificationStatus === "verified_auto").length;
  if (redditVerified > 0) {
    console.log(`✅ Success! ${redditVerified} Reddit source(s) auto-verified and ready for scraping!\n`);
  } else {
    console.log(`⚠️  No Reddit sources were auto-verified. They may need higher confidence scores.\n`);
  }
}

main().catch(console.error);
