/**
 * Debug Reddit HTML Structure
 *
 * This script fetches a Reddit page and inspects its HTML structure
 * to understand why the extractor isn't finding posts/comments.
 */

import { config } from "dotenv";
import { resolve } from "path";
import * as cheerio from "cheerio";

config({ path: resolve(process.cwd(), ".env.local") });

import { Crawl4AIProvider } from "@/lib/scraping/crawl4ai-client";
import { getPlatformConfig } from "@/lib/scraping/platform-configs";

async function debugRedditStructure() {
  const provider = new Crawl4AIProvider();
  const redditConfig = getPlatformConfig("reddit");

  const url = "https://www.reddit.com/r/CarsIndia/comments/1ry3n6d/honest_tata_ownership_review/";

  console.log("🌐 Fetching Reddit page...\n");

  const result = await provider.fetch({
    url,
    waitForSelector: redditConfig.waitForSelector,
    delayMs: redditConfig.delayMs,
    timeoutMs: redditConfig.timeoutMs,
    bypassCache: true,
  });

  console.log(`✅ Fetched: ${result.html.length} bytes\n`);

  const $ = cheerio.load(result.html);

  // Check for various Reddit selectors
  console.log("🔍 Checking for Reddit elements:\n");

  const checks = [
    { name: "shreddit-post", selector: "shreddit-post" },
    { name: "shreddit-comment", selector: "shreddit-comment" },
    { name: "post-container", selector: 'div[data-testid="post-container"]' },
    { name: "post title (h1)", selector: "h1" },
    { name: "post content", selector: '[slot="text-body"]' },
    { name: "comments", selector: 'div[data-testid="comment"]' },
    { name: "faceplate-tracker", selector: "faceplate-tracker" },
    { name: "shreddit-app", selector: "shreddit-app" },
    { name: "any article", selector: "article" },
    { name: "any post", selector: '[data-testid*="post"]' },
  ];

  checks.forEach(check => {
    const elements = $(check.selector);
    console.log(`   ${check.name.padEnd(25)}: ${elements.length} found`);

    if (elements.length > 0) {
      const first = elements.first();
      const node = first.get(0);
      if (node && 'attribs' in node) {
        console.log(`      - Attributes: ${Object.keys(node.attribs || {}).join(", ") || "none"}`);
      }
      const text = first.text().trim().substring(0, 100);
      if (text) {
        console.log(`      - Text preview: ${text}...`);
      }
    }
  });

  console.log("\n📄 Page structure preview:\n");
  console.log(result.html.substring(0, 2000));

  console.log("\n\n🔍 Searching for post content patterns:\n");

  // Look for post title
  const h1 = $("h1").first().text();
  console.log(`   Post title (h1): ${h1}`);

  // Look for any text that looks like the post content
  const allText = $("body").text().substring(0, 500);
  console.log(`\n   Body text preview:\n${allText}\n`);
}

debugRedditStructure().catch(console.error);
