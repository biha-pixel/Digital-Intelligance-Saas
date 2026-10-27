/**
 * Deep inspect shreddit-post component to find where content actually lives
 */

import { config } from "dotenv";
import { resolve } from "path";
import * as cheerio from "cheerio";

config({ path: resolve(process.cwd(), ".env.local") });

import { Crawl4AIProvider } from "@/lib/scraping/crawl4ai-client";
import { getPlatformConfig } from "@/lib/scraping/platform-configs";

async function inspectShredditPost() {
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

  const $ = cheerio.load(result.html);

  console.log("🔍 Inspecting shreddit-post component:\n");

  const post = $("shreddit-post").first();

  if (post.length === 0) {
    console.log("❌ No shreddit-post found!");
    return;
  }

  console.log("✅ Found shreddit-post\n");
  console.log("📋 All attributes:");
  const attrs = post.get(0);
  if (attrs && 'attribs' in attrs) {
    Object.entries(attrs.attribs).forEach(([key, value]) => {
      const displayValue = typeof value === 'string' && value.length > 100
        ? value.substring(0, 100) + "..."
        : value;
      console.log(`   ${key}: ${displayValue}`);
    });
  }

  console.log("\n🔍 Looking for post content in various locations:\n");

  // Check for content in various selectors inside the post
  const contentChecks = [
    { name: "Direct text()", value: post.text().substring(0, 200) },
    { name: "Direct html()", value: post.html()?.substring(0, 200) },
    { name: 'slot="text-body"', value: post.find('[slot="text-body"]').text().substring(0, 200) },
    { name: 'div[slot="text-body"]', value: post.find('div[slot="text-body"]').text().substring(0, 200) },
    { name: "Any div inside", value: post.find("div").first().text().substring(0, 200) },
    { name: "Any p inside", value: post.find("p").first().text().substring(0, 200) },
    { name: "h1 (title)", value: $("h1").first().text().substring(0, 200) },
  ];

  contentChecks.forEach(check => {
    console.log(`   ${check.name.padEnd(25)}: ${check.value ? `"${check.value}..."` : "(empty)"}`);
  });

  console.log("\n🔍 Checking if post body is in a separate element:\n");

  // Reddit might render post body outside the shreddit-post component
  const possibleBodySelectors = [
    'div[data-testid="post-body"]',
    'div[slot="text-body"]',
    '.RichTextJSON-root',
    'div[id*="post-rtjson"]',
    'shreddit-post-body',
    '[data-post-body]',
  ];

  possibleBodySelectors.forEach(selector => {
    const elements = $(selector);
    if (elements.length > 0) {
      const text = elements.first().text().trim().substring(0, 200);
      console.log(`   ✅ ${selector}: Found ${elements.length} | "${text}..."`);
    } else {
      console.log(`   ❌ ${selector}: Not found`);
    }
  });

  console.log("\n🔍 Searching full HTML for post content patterns:\n");

  // The post title is "Honest TATA ownership review"
  // Let's search for content that might be the body
  const searchPatterns = [
    "ownership",
    "experience",
    "review",
    "Tata",
  ];

  searchPatterns.forEach(pattern => {
    const regex = new RegExp(pattern, "gi");
    const matches = result.html.match(regex);
    console.log(`   "${pattern}": ${matches?.length || 0} occurrences`);
  });

  console.log("\n📄 Inspecting first shreddit-comment:\n");

  const comment = $("shreddit-comment").first();
  if (comment.length > 0) {
    console.log("✅ Found shreddit-comment\n");

    const commentAttrs = comment.get(0);
    if (commentAttrs && 'attribs' in commentAttrs) {
      const importantAttrs = ['author', 'created', 'score', 'thingid', 'depth'];
      console.log("📋 Key attributes:");
      importantAttrs.forEach(key => {
        const value = commentAttrs.attribs[key];
        if (value) {
          console.log(`   ${key}: ${value}`);
        }
      });
    }

    console.log("\n🔍 Looking for comment content:");
    const commentContentChecks = [
      { name: "Direct text()", value: comment.text().substring(0, 200) },
      { name: 'slot="comment"', value: comment.find('[slot="comment"]').text().substring(0, 200) },
      { name: 'div[slot="comment"]', value: comment.find('div[slot="comment"]').text().substring(0, 200) },
      { name: "Any p", value: comment.find("p").first().text().substring(0, 200) },
      { name: "Any div", value: comment.find("div").first().text().substring(0, 200) },
    ];

    commentContentChecks.forEach(check => {
      console.log(`   ${check.name.padEnd(25)}: ${check.value ? `"${check.value}..."` : "(empty)"}`);
    });
  }
}

inspectShredditPost().catch(console.error);
