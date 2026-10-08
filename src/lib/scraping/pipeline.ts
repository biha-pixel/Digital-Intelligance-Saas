import crypto from "crypto";
import { getExtractorForSourceType } from "./extractors";
import { validateUrlForScraping } from "../security/ssrf";
import { isCrawlable } from "./robots";
import { Crawl4AIProvider } from "./crawl4ai-client";
import { createAdminClient } from "@/lib/supabase/admin";
import { SourceType, Json } from "@/types/database.types";

export async function runScrapingPipeline(
  organizationId: string,
  sourceId: string,
  sourceUrl: string,
  sourceType: SourceType
) {
  const supabase = createAdminClient();

  // 1. SSRF Guard
  const ssrfCheck = await validateUrlForScraping(sourceUrl);
  if (!ssrfCheck.valid) {
    throw new Error(`SSRF check failed: ${ssrfCheck.error}`);
  }

  // 2. Robots.txt Compliance
  const allowed = await isCrawlable(ssrfCheck.normalizedUrl, "CXPulseBot/1.0");
  if (!allowed) {
    throw new Error("Blocked by robots.txt");
  }

  // 3. Fetch Content
  const provider = new Crawl4AIProvider();
  const scrapeResult = await provider.fetch({ url: ssrfCheck.normalizedUrl });

  if (!scrapeResult.html) {
    throw new Error("Scraping failed: No HTML content returned");
  }

  const contentHash = crypto
    .createHash("sha256")
    .update(scrapeResult.html)
    .digest("hex");

  // 4. Extract
  const extractor = getExtractorForSourceType(sourceType);
  const extractionResult = extractor.extract(scrapeResult.html, ssrfCheck.normalizedUrl);

  // 5. Ingest
  const { data: rawScrape, error: rawScrapeError } = await supabase
    .from("raw_scrapes")
    .insert({
      organization_id: organizationId,
      source_id: sourceId,
      source_url: ssrfCheck.normalizedUrl,
      http_status: 200,
      content_hash: contentHash,
      raw_html: scrapeResult.html,
      raw_text: scrapeResult.markdown || "",
    })
    .select()
    .single();

  if (rawScrapeError) throw rawScrapeError;

  // 6. Save Feedback Items (with zero-PII pseudonymization handled in extractor)
  if (extractionResult.items.length > 0) {
    const { error: feedbackError } = await supabase
      .from("feedback_items")
      .insert(
        extractionResult.items.map((item) => ({
          organization_id: organizationId,
          source_id: sourceId,
          raw_scrape_id: rawScrape.id,
          author_identifier: item.authorIdentifier,
          posted_at: item.postedAt || null,
          content_text: item.contentText,
          rating: item.rating || null,
          language_code: item.languageCode,
          source_type: sourceType,
          word_count: item.wordCount,
          content_hash: item.contentHash,
          sentiment_label: null,
          sentiment_score: null,
          topics: [],
          intent: null,
          key_entities: (item.metadata as unknown as Json) || {},
        }))
      );

    if (feedbackError) throw feedbackError;
  }

  return { itemsExtracted: extractionResult.totalExtracted, rawScrapeId: rawScrape.id };
}
