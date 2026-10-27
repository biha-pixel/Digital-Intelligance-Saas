import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

/**
 * Debug Logger for Scraping Pipeline
 *
 * Saves raw HTML and metadata for failed extractions to help debug
 * CSS selector issues, anti-bot pages, and AI extraction problems.
 */

const DEBUG_DIR = path.join(process.cwd(), ".debug", "scraping");

export interface ScrapingDebugData {
  sourceType: string;
  sourceUrl: string;
  timestamp: string;
  extractionMethod: "css" | "ai-fallback";
  itemsExtracted: number;
  htmlLength: number;
  rawHtml: string;
  textContentPreview: string;
  httpStatus?: number;
  error?: string;
  aiConfidence?: number;
}

/**
 * Saves raw HTML and metadata for a failed extraction
 */
export async function saveDebugScrape(data: ScrapingDebugData): Promise<string | null> {
  // Only save if extraction failed (0 items)
  if (data.itemsExtracted > 0) {
    return null;
  }

  try {
    // Ensure debug directory exists
    await fs.mkdir(DEBUG_DIR, { recursive: true });

    // Generate unique filename
    const urlHash = crypto.createHash("md5").update(data.sourceUrl).digest("hex").substring(0, 8);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `${data.sourceType}_${urlHash}_${timestamp}.json`;
    const filepath = path.join(DEBUG_DIR, filename);

    // Save debug data
    await fs.writeFile(
      filepath,
      JSON.stringify(
        {
          ...data,
          rawHtml: data.rawHtml.substring(0, 50000), // Limit to 50KB for readability
        },
        null,
        2
      )
    );

    console.log(`[Debug] Saved failed extraction to ${filename}`);
    return filepath;
  } catch (error) {
    console.error(`[Debug] Failed to save debug data: ${error instanceof Error ? error.message : "Unknown error"}`);
    return null;
  }
}

/**
 * Gets a preview of text content (first 500 chars)
 */
export function getTextPreview(html: string): string {
  const $ = require("cheerio").load(html);

  // Remove scripts, styles, and common noise
  $("script, style, noscript, nav, header, footer, svg").remove();

  const text = $.text().trim();
  return text.substring(0, 500);
}

/**
 * Checks if HTML looks like an anti-bot page
 */
export function detectAntiBotPage(html: string): boolean {
  const antiBotSignals = [
    "captcha",
    "cloudflare",
    "access denied",
    "robot",
    "automated",
    "suspicious activity",
    "verify you are human",
    "checking your browser",
    "security check",
    "please wait",
    "just a moment",
  ];

  const lowerHtml = html.toLowerCase();
  return antiBotSignals.some((signal) => lowerHtml.includes(signal));
}

/**
 * Checks if page has no reviews/content
 */
export function detectNoContentPage(html: string): boolean {
  const noContentSignals = [
    "no reviews yet",
    "be the first to review",
    "no ratings",
    "this page doesn't exist",
    "404",
    "page not found",
    "not available",
    "coming soon",
  ];

  const lowerHtml = html.toLowerCase();
  return noContentSignals.some((signal) => lowerHtml.includes(signal));
}
