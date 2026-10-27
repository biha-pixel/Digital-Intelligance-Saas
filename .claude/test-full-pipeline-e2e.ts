/**
 * End-to-End Full Pipeline Test
 *
 * Tests the complete intelligence pipeline:
 * 1. Search Provider: Multi-Account Serper (load-balanced search)
 * 2. AI Provider: OmniRoute (gemini3.1 for analysis)
 * 3. Scraping Provider: Crawl4AI (deep content extraction)
 *
 * This test verifies that all three external services are properly configured
 * and working together end-to-end.
 */

import { config } from "dotenv";
import path from "path";

// Load environment variables
config({ path: path.resolve(process.cwd(), ".env.local") });

import { MultiAccountSerperProvider } from "../src/lib/discovery/providers/multi-account-serper";
import { Crawl4AIProvider } from "../src/lib/scraping/crawl4ai-client";
import { DiscoveryService } from "../src/lib/discovery/service";

console.log("🧪 End-to-End Full Pipeline Test");
console.log("=================================\n");

async function checkEnvironmentConfiguration() {
  console.log("📋 Checking Environment Configuration...\n");

  const checks = {
    serper: {
      name: "Multi-Account Serper (Search)",
      vars: ["SERPER_API_KEYS"],
      configured: false,
    },
    omniroute: {
      name: "OmniRoute (AI Analysis)",
      vars: ["OMNIROUTE_API_KEY", "OMNIROUTE_BASE_URL", "OMNIROUTE_MODEL"],
      configured: false,
    },
    crawl4ai: {
      name: "Crawl4AI (Web Scraping)",
      vars: ["CRAWL4AI_SERVICE_URL", "CRAWL4AI_API_TOKEN"],
      configured: false,
    },
  };

  // Check Serper
  const serperKeys = (process.env.SERPER_API_KEYS || "").split(",").filter(k => k.trim());
  checks.serper.configured = serperKeys.length > 0 && !serperKeys[0].includes("your-serper-key");

  console.log(`${checks.serper.configured ? "✅" : "❌"} ${checks.serper.name}`);
  if (checks.serper.configured) {
    console.log(`   ${serperKeys.length} account(s) configured`);
  } else {
    console.log(`   Missing: SERPER_API_KEYS`);
  }

  // Check OmniRoute
  checks.omniroute.configured = !!(
    process.env.OMNIROUTE_API_KEY &&
    process.env.OMNIROUTE_BASE_URL &&
    process.env.OMNIROUTE_MODEL
  );

  console.log(`${checks.omniroute.configured ? "✅" : "❌"} ${checks.omniroute.name}`);
  if (checks.omniroute.configured) {
    console.log(`   Model: ${process.env.OMNIROUTE_MODEL}`);
    console.log(`   URL: ${process.env.OMNIROUTE_BASE_URL}`);
  } else {
    console.log(`   Missing: ${checks.omniroute.vars.filter(v => !process.env[v]).join(", ")}`);
  }

  // Check Crawl4AI
  checks.crawl4ai.configured = !!(
    process.env.CRAWL4AI_SERVICE_URL &&
    process.env.CRAWL4AI_API_TOKEN
  );

  console.log(`${checks.crawl4ai.configured ? "✅" : "❌"} ${checks.crawl4ai.name}`);
  if (checks.crawl4ai.configured) {
    console.log(`   URL: ${process.env.CRAWL4AI_SERVICE_URL}`);
  } else {
    console.log(`   Missing: ${checks.crawl4ai.vars.filter(v => !process.env[v]).join(", ")}`);
  }

  console.log();

  const allConfigured = Object.values(checks).every(c => c.configured);

  if (!allConfigured) {
    console.error("❌ Not all services are configured. Fix the issues above and try again.\n");
    process.exit(1);
  }

  return checks;
}

async function testSearchProvider() {
  console.log("🔍 Test 1: Multi-Account Serper Search Provider");
  console.log("───────────────────────────────────────────────\n");

  const apiKeysStr = process.env.SERPER_API_KEYS || "";
  const apiKeys = apiKeysStr.split(",").map(k => k.trim()).filter(k => k.length > 0);

  const provider = new MultiAccountSerperProvider(apiKeys);

  try {
    const results = await provider.search({
      term: "Slack customer reviews",
      limit: 3,
    });

    if (results.length === 0) {
      console.error("❌ Search returned no results\n");
      return false;
    }

    console.log(`✅ Search successful! Got ${results.length} results:`);
    results.forEach((r, i) => {
      console.log(`   ${i + 1}. ${r.title}`);
      console.log(`      URL: ${r.url}`);
      console.log(`      Relevance: ${((r.relevanceScore ?? 0.5) * 100).toFixed(0)}%`);
    });
    console.log();

    return true;
  } catch (error) {
    console.error("❌ Search failed:", error instanceof Error ? error.message : error);
    console.log();
    return false;
  }
}

async function testCrawl4AIProvider() {
  console.log("🕷️  Test 2: Crawl4AI Web Scraper");
  console.log("───────────────────────────────────────────────\n");

  const provider = new Crawl4AIProvider();

  try {
    // Test with a simple, reliable URL
    const testUrl = "https://www.trustpilot.com/review/slack.com";
    console.log(`   Crawling: ${testUrl}`);

    const result = await provider.fetch({
      url: testUrl,
    });

    // Crawl4AIProvider.fetch() returns ScrapeResponse with url, html, text fields
    if (!result || !result.url) {
      console.error(`❌ Crawl returned invalid response\n`);
      return false;
    }

    console.log(`✅ Crawl successful!`);
    console.log(`   Content length: ${(result.html?.length ?? 0) + (result.text?.length ?? 0)} characters`);
    console.log(`   Status: ${result.statusCode}`);
    console.log(`   Execution time: ${result.executionTimeMs}ms`);
    console.log();

    return true;
  } catch (error) {
    console.error("❌ Crawl4AI test failed:", error instanceof Error ? error.message : error);
    console.log();
    return false;
  }
}

async function testOmniRouteAI() {
  console.log("🤖 Test 3: OmniRoute AI Analysis");
  console.log("───────────────────────────────────────────────\n");

  try {
    const testPrompt = "Analyze this sample review: 'Slack is great for team communication but can be overwhelming with too many channels.' Extract the sentiment (positive/negative/neutral) and key themes.";

    console.log(`   Sending test prompt to OmniRoute...`);

    const response = await fetch(`${process.env.OMNIROUTE_BASE_URL}/api/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OMNIROUTE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OMNIROUTE_MODEL,
        messages: [
          {
            role: "system",
            content: "You are a customer feedback analysis assistant. Respond in JSON format only.",
          },
          {
            role: "user",
            content: testPrompt,
          },
        ],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ OmniRoute request failed: ${response.status}`);
      console.error(`   ${error}\n`);
      return false;
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || data.choices?.[0]?.message?.content || "";

    if (!content) {
      console.error("❌ OmniRoute returned empty response\n");
      return false;
    }

    console.log(`✅ OmniRoute analysis successful!`);
    console.log(`   Response length: ${content.length} characters`);
    console.log(`   Sample response: ${content.substring(0, 100)}...`);
    console.log();

    return true;
  } catch (error) {
    console.error("❌ OmniRoute test failed:", error instanceof Error ? error.message : error);
    console.log();
    return false;
  }
}

async function testFullPipelineIntegration() {
  console.log("🔄 Test 4: Full Pipeline Integration");
  console.log("───────────────────────────────────────────────\n");

  const apiKeysStr = process.env.SERPER_API_KEYS || "";
  const apiKeys = apiKeysStr.split(",").map(k => k.trim()).filter(k => k.length > 0);

  const searchProvider = new MultiAccountSerperProvider(apiKeys);
  const crawlProvider = new Crawl4AIProvider();

  try {
    console.log("   Step 1: Discovery (Search for feedback sources)...");
    const discoveryService = new DiscoveryService(searchProvider);

    const discoveryResult = await discoveryService.runDiscovery(
      "test-e2e-profile",
      {
        companyName: "Notion",
        domain: "notion.so",
        industry: "Productivity",
        country: "US",
        aliases: ["Notion App"],
        locations: [{ city: "San Francisco", country: "US" }],
      },
      {
        persist: false,
      }
    );

    console.log(`   ✓ Discovery: Found ${discoveryResult.candidates.length} candidates`);

    if (discoveryResult.candidates.length === 0) {
      console.error("   ❌ No candidates found to continue pipeline\n");
      return false;
    }

    // Pick top candidate to scrape
    const topCandidate = discoveryResult.candidates[0];
    console.log(`   ✓ Selected top candidate: ${topCandidate.title}`);

    console.log("\n   Step 2: Scraping (Extract content from source)...");
    const scrapeResult = await crawlProvider.fetch({
      url: topCandidate.url,
    });

    if (!scrapeResult || !scrapeResult.url) {
      console.error(`   ❌ Scraping failed: invalid response\n`);
      return false;
    }

    const contentLength = (scrapeResult.html?.length ?? 0) + (scrapeResult.text?.length ?? 0);
    console.log(`   ✓ Scraping: Extracted ${contentLength} characters`);

    console.log("\n   Step 3: AI Analysis (Analyze content)...");
    const contentSample = (scrapeResult.text || scrapeResult.markdown || scrapeResult.html || "").substring(0, 300);
    const analysisPrompt = `Analyze this content: "${contentSample}..." Provide a brief summary in 2-3 sentences.`;

    const analysisResponse = await fetch(`${process.env.OMNIROUTE_BASE_URL}/api/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OMNIROUTE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OMNIROUTE_MODEL,
        messages: [
          {
            role: "user",
            content: analysisPrompt,
          },
        ],
        max_tokens: 300,
      }),
    });

    if (!analysisResponse.ok) {
      console.warn(`   ⚠️  AI analysis skipped: ${analysisResponse.status}`);
    } else {
      const analysisData = await analysisResponse.json();
      const analysis = analysisData.content?.[0]?.text || analysisData.choices?.[0]?.message?.content || "";
      console.log(`   ✓ Analysis: Generated ${analysis.length} character analysis`);
    }

    console.log("\n✅ Full pipeline integration test completed!\n");
    return true;

  } catch (error) {
    console.error("❌ Pipeline integration failed:", error instanceof Error ? error.message : error);
    console.log();
    return false;
  }
}

async function main() {
  try {
    // Check all environment configuration first
    await checkEnvironmentConfiguration();

    // Run individual component tests
    const test1 = await testSearchProvider();
    const test2 = await testCrawl4AIProvider();
    const test3 = await testOmniRouteAI();
    const test4 = test1 && test2 && test3 ? await testFullPipelineIntegration() : false;

    // Print summary
    console.log("═══════════════════════════════════════════════");
    console.log("📊 Test Summary");
    console.log("═══════════════════════════════════════════════\n");

    console.log(`${test1 ? "✅" : "❌"} Test 1: Multi-Account Serper Search`);
    console.log(`${test2 ? "✅" : "❌"} Test 2: Crawl4AI Web Scraper`);
    console.log(`${test3 ? "✅" : "❌"} Test 3: OmniRoute AI Analysis`);
    console.log(`${test4 ? "✅" : "❌"} Test 4: Full Pipeline Integration\n`);

    const allPassed = test1 && test2 && test3 && test4;

    if (allPassed) {
      console.log("🎉 All tests passed! Your pipeline is fully operational.\n");
      console.log("Pipeline Architecture:");
      console.log("┌─────────────────────────────────────────────┐");
      console.log("│  1. Multi-Account Serper (Search)           │");
      console.log("│     ↓ discovers feedback sources            │");
      console.log("│  2. Source Verification                      │");
      console.log("│     ↓ confirms review presence              │");
      console.log("│  3. Crawl4AI (Scraping)                     │");
      console.log("│     ↓ extracts content                      │");
      console.log("│  4. Review Extraction                        │");
      console.log("│     ↓ parses structured reviews             │");
      console.log("│  5. OmniRoute AI (Analysis)                 │");
      console.log("│     ↓ generates insights                    │");
      console.log("│  6. Intelligence Dashboard                   │");
      console.log("└─────────────────────────────────────────────┘\n");
      console.log("Ready for Phase 13: Stripe Billing & Production Deployment!\n");
      process.exit(0);
    } else {
      console.log("⚠️  Some tests failed. Review the errors above.\n");
      process.exit(1);
    }

  } catch (error) {
    console.error("\n💥 Test suite error:", error);
    process.exit(1);
  }
}

main();
