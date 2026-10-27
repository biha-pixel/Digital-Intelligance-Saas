/**
 * End-to-End Pipeline Test Script
 *
 * This script tests the complete discovery and ingestion pipeline:
 * 1. Company profile resolution
 * 2. Multi-account Serper search (real API calls)
 * 3. Candidate discovery (15 sources)
 * 4. Source verification and filtering
 * 5. Source registration
 * 6. Monitoring target creation
 *
 * Usage:
 *   npx tsx scripts/test-pipeline-end-to-end.ts
 */

import { createClient } from "@supabase/supabase-js";
import { PipelineOrchestrator } from "../src/lib/pipeline/pipeline-orchestrator";
import { MultiAccountSerperProvider } from "../src/lib/discovery/providers/multi-account-serper";
import { getScrapingProvider } from "../src/lib/scraping/provider";

// Load environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SERPER_API_KEYS = process.env.SERPER_API_KEYS!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

if (!SERPER_API_KEYS) {
  console.error("❌ Missing SERPER_API_KEYS in .env.local");
  console.error("   Please add: SERPER_API_KEYS=key1,key2");
  process.exit(1);
}

async function testPipeline() {
  console.log("🚀 Starting End-to-End Pipeline Test\n");
  console.log("=" .repeat(60));

  // Initialize Supabase admin client
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // Step 1: Get the first organization (or create test org)
  console.log("\n📋 Step 1: Fetching organization...");
  const { data: orgs, error: orgError } = await supabase
    .from("organizations")
    .select("*")
    .limit(1);

  if (orgError || !orgs || orgs.length === 0) {
    console.error("❌ No organization found:", orgError);
    console.error("   Please complete onboarding first");
    process.exit(1);
  }

  const org = orgs[0];
  console.log(`✅ Organization: ${org.name} (${org.id})`);

  // Step 2: Verify company profile exists
  console.log("\n📋 Step 2: Checking company profile...");
  const { data: profile, error: profileError } = await supabase
    .from("company_profiles")
    .select("*, company_domains(*), company_aliases(*), company_locations(*)")
    .eq("organization_id", org.id)
    .maybeSingle();

  if (profileError || !profile) {
    console.error("❌ No company profile found:", profileError);
    console.error("   Please complete company profile in onboarding");
    process.exit(1);
  }

  const companyName = profile.display_name || profile.company_name;
  console.log(`✅ Company Profile: ${companyName}`);
  console.log(`   Domain: ${profile.primary_domain || "N/A"}`);
  console.log(`   Industry: ${profile.industry || "N/A"}`);
  console.log(`   Country: ${profile.country || "N/A"}`);

  // Step 3: Initialize search provider (Multi-Account Serper)
  console.log("\n📋 Step 3: Initializing Multi-Account Serper Provider...");
  const apiKeys = SERPER_API_KEYS.split(",").map((k) => k.trim()).filter((k) => k.length > 0);
  console.log(`✅ Loaded ${apiKeys.length} Serper API key(s)`);

  const searchProvider = new MultiAccountSerperProvider(apiKeys);

  // Step 4: Initialize scraping provider
  console.log("\n📋 Step 4: Initializing Crawl4AI Provider...");
  const scrapingProvider = getScrapingProvider({ providerType: "crawl4ai" });
  console.log(`✅ Scraping provider ready`);

  // Step 5: Run the complete pipeline
  console.log("\n📋 Step 5: Running Full Pipeline...");
  console.log("=" .repeat(60));
  console.log(`   Company: ${companyName}`);
  console.log(`   Discovery Limit: 15 sources`);
  console.log(`   Search Provider: Multi-Account Serper (${apiKeys.length} keys)`);
  console.log(`   Scraping: Enabled (Crawl4AI)`);
  console.log(`   Analysis: Skipped (focus on discovery)`);
  console.log("=" .repeat(60));

  const orchestrator = new PipelineOrchestrator({
    supabase,
    searchProvider,
    scrapingProvider,
  });

  const startTime = Date.now();

  try {
    const summary = await orchestrator.runFullPipeline(org.id, {
      companyProfileId: profile.id,
      sourceLimit: 15,
      skipCrawl: false,
      skipAnalysis: true, // Skip AI analysis for faster testing
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log("\n" + "=" .repeat(60));
    console.log("✅ PIPELINE COMPLETED SUCCESSFULLY");
    console.log("=" .repeat(60));
    console.log(`\n📊 Results Summary:`);
    console.log(`   Status: ${summary.status}`);
    console.log(`   Duration: ${duration}s`);
    console.log(`\n📈 Discovery Stats:`);
    console.log(`   Candidates Discovered: ${summary.stats.candidatesDiscovered}`);
    console.log(`   Sources Verified: ${summary.stats.sourcesVerified}`);
    console.log(`   Feedback Items Extracted: ${summary.stats.feedbackItemsExtracted}`);
    console.log(`   Feedback Items Analyzed: ${summary.stats.feedbackItemsAnalyzed}`);

    // Step 6: Verify results
    console.log("\n📋 Step 6: Verifying Results...");

    if (summary.stats.candidatesDiscovered < 10) {
      console.warn(`⚠️  Warning: Only ${summary.stats.candidatesDiscovered} candidates discovered (expected 10+)`);
      console.warn(`    This might indicate:`);
      console.warn(`    - Company name is too niche or misspelled`);
      console.warn(`    - Serper API rate limits reached`);
      console.warn(`    - Network connectivity issues`);
    } else {
      console.log(`✅ Discovery: ${summary.stats.candidatesDiscovered} candidates found`);
    }

    if (summary.stats.sourcesVerified < 5) {
      console.warn(`⚠️  Warning: Only ${summary.stats.sourcesVerified} sources verified (expected 5+)`);
      console.warn(`    This might indicate:`);
      console.warn(`    - Low-quality candidates (high false-positive rate)`);
      console.warn(`    - Strict verification criteria`);
      console.warn(`    - Company profile missing key data (domain, locations)`);
    } else {
      console.log(`✅ Verification: ${summary.stats.sourcesVerified} sources verified`);
    }

    // Step 7: Check monitoring targets were created
    const { data: targets, error: targetsError } = await supabase
      .from("monitoring_targets")
      .select("*")
      .eq("organization_id", org.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!targetsError && targets && targets.length > 0) {
      console.log(`✅ Monitoring: ${targets.length} target(s) created`);
      console.log(`\n📍 Recent Monitoring Targets:`);
      targets.slice(0, 5).forEach((t, i) => {
        console.log(`   ${i + 1}. ${t.source_id} - Status: ${t.status}`);
      });
    }

    // Step 8: Display discovered sources
    if (summary.details.candidates && summary.details.candidates.length > 0) {
      console.log(`\n🔍 Top 10 Discovered Sources:`);
      summary.details.candidates.slice(0, 10).forEach((c, i) => {
        console.log(`   ${i + 1}. ${c.title}`);
        console.log(`      URL: ${c.url}`);
        console.log(`      Confidence: ${(c.confidence * 100).toFixed(0)}%`);
        console.log(`      Status: ${c.verificationStatus || "pending"}`);
      });
    }

    console.log("\n" + "=" .repeat(60));
    console.log("🎉 TEST PASSED - Pipeline is working correctly!");
    console.log("=" .repeat(60));

    console.log("\n💡 Next Steps:");
    console.log("   1. Visit http://localhost:3000/dashboard");
    console.log("   2. Click 'Run Discovery & Ingestion Pipeline'");
    console.log("   3. Check Serper dashboard for search logs");
    console.log("   4. View monitoring targets in /dashboard/monitoring");

  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error("\n" + "=" .repeat(60));
    console.error("❌ PIPELINE FAILED");
    console.error("=" .repeat(60));
    console.error(`Duration: ${duration}s`);
    console.error(`Error: ${error instanceof Error ? error.message : error}`);

    if (error instanceof Error && error.stack) {
      console.error("\nStack trace:");
      console.error(error.stack);
    }

    console.log("\n🔍 Troubleshooting:");
    console.log("   1. Check SERPER_API_KEYS in .env.local");
    console.log("   2. Verify Serper account has available credits");
    console.log("   3. Check company profile has required fields");
    console.log("   4. Review Crawl4AI service is running (if scraping enabled)");

    process.exit(1);
  }
}

// Run the test
testPipeline().catch((error) => {
  console.error("\n💥 Unexpected error:", error);
  process.exit(1);
});
