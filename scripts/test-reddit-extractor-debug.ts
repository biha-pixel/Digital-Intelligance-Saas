/**
 * Test Reddit extractor directly with debug output
 */

import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

import { Crawl4AIProvider } from "@/lib/scraping/crawl4ai-client";
import { ForumRedditExtractor } from "@/lib/scraping/extractors/reddit";
import { getPlatformConfig } from "@/lib/scraping/platform-configs";

async function testRedditExtractor() {
  const provider = new Crawl4AIProvider();
  const config = getPlatformConfig("reddit");

  const url = "https://www.reddit.com/r/CarsIndia/comments/1ry3n6d/honest_tata_ownership_review/";

  console.log("🌐 Fetching Reddit page...\n");

  const result = await provider.fetch({
    url,
    waitForSelector: config.waitForSelector,
    delayMs: config.delayMs,
    timeoutMs: config.timeoutMs,
    bypassCache: true,
  });

  console.log(`✅ Fetched: ${result.html.length} bytes\n`);

  console.log("🔍 Testing extractor...\n");

  const extractor = new ForumRedditExtractor();
  const extractionResult = extractor.extract(result.html, url);

  console.log(`📊 Extraction Results:`);
  console.log(`   Total extracted: ${extractionResult.totalExtracted}`);
  console.log(`   Items returned: ${extractionResult.items.length}`);
  console.log(`   Page title: ${extractionResult.pageTitle}\n`);

  if (extractionResult.items.length > 0) {
    console.log(`✅ Success! First 3 items:\n`);
    extractionResult.items.slice(0, 3).forEach((item, idx) => {
      console.log(`${idx + 1}. ${item.authorDisplayName || "Anonymous"}`);
      console.log(`   Content: ${item.contentText.substring(0, 150)}...`);
      console.log(`   Type: ${item.feedbackType}`);
      console.log(`   Posted: ${item.postedAt}\n`);
    });
  } else {
    console.log(`❌ No items extracted. Let me check what's being filtered out...\n`);

    // Manual extraction to see what's happening
    const cheerio = await import("cheerio");
    const $ = cheerio.load(result.html);

    const shredditComments = $("shreddit-comment");
    console.log(`Found ${shredditComments.length} shreddit-comment elements\n`);

    let processedCount = 0;
    let skippedNoAuthor = 0;
    let skippedNoBody = 0;
    let skippedTooShort = 0;

    shredditComments.each((_, el) => {
      const comment = $(el);
      const author = comment.attr("author");

      if (!author || author.toLowerCase() === "automoderator" || author === "[deleted]") {
        skippedNoAuthor++;
        return;
      }

      // Try to find content
      const rtjsonDiv = comment.find('div[id*="-rtjson"]').first();
      const body = rtjsonDiv.text().trim();

      if (!body) {
        skippedNoBody++;
        console.log(`   ❌ Comment by ${author}: No body found (rtjson div exists: ${rtjsonDiv.length > 0})`);
        if (rtjsonDiv.length > 0) {
          console.log(`      RTJson HTML: ${rtjsonDiv.html()?.substring(0, 200)}`);
        }
        return;
      }

      if (body.length < 10) {
        skippedTooShort++;
        console.log(`   ❌ Comment by ${author}: Too short (${body.length} chars): "${body}"`);
        return;
      }

      processedCount++;
      console.log(`   ✅ Comment by ${author}: ${body.length} chars - "${body.substring(0, 100)}..."`);
    });

    console.log(`\n📊 Processing Summary:`);
    console.log(`   Total comments found: ${shredditComments.length}`);
    console.log(`   Skipped (no author): ${skippedNoAuthor}`);
    console.log(`   Skipped (no body): ${skippedNoBody}`);
    console.log(`   Skipped (too short): ${skippedTooShort}`);
    console.log(`   Should have processed: ${processedCount}`);
  }
}

testRedditExtractor().catch(console.error);
