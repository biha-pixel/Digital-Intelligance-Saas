import { validateUrlForScraping } from "../security/ssrf";
import { isCrawlable } from "./robots";
import { getScrapingProvider } from "./provider";
import { ScrapingProvider } from "./types";
import { createAdminClient } from "@/lib/supabase/admin";
import { SourceType } from "@/types/database.types";
import { FeedbackIngestionService, IngestionExecutionSummary } from "../feedback/ingestion";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * End-to-end Scraping and Feedback Ingestion Pipeline
 *
 * Architecture Flow:
 * Source URL → SSRF Guard → Robots.txt Policy → ScrapingProvider → Crawl4AI → FeedbackIngestionService (Extraction → Canonical Normalization → Deduplication → Supabase)
 */
export async function runScrapingPipeline(
  organizationId: string,
  sourceId: string,
  sourceUrl: string,
  sourceType: SourceType,
  monitoringTargetId?: string,
  options?: {
    supabase?: SupabaseClient<any>;
    scrapingProvider?: ScrapingProvider;
    skipRobotsCheck?: boolean;
    skipSsrfCheck?: boolean;
  }
): Promise<IngestionExecutionSummary> {
  const supabase = options?.supabase || createAdminClient();

  let targetUrl = sourceUrl;

  // 1. SSRF Pre-flight Validation
  if (!options?.skipSsrfCheck) {
    const ssrfCheck = await validateUrlForScraping(sourceUrl);
    if (!ssrfCheck.valid) {
      throw new Error(`SSRF check failed: ${ssrfCheck.error}`);
    }
    targetUrl = ssrfCheck.normalizedUrl;
  }

  // 2. Robots.txt Compliance Check
  if (!options?.skipRobotsCheck) {
    const allowed = await isCrawlable(targetUrl, "CXPulseBot/1.0");
    if (!allowed) {
      throw new Error("Blocked by robots.txt directive");
    }
  }

  // 3. Provider Fetch Execution (Decoupled via ScrapingProvider)
  const provider = options?.scrapingProvider || getScrapingProvider();
  const scrapeResult = await provider.fetch({ url: targetUrl });

  if (!scrapeResult.html && !scrapeResult.text) {
    throw new Error("Scraping failed: No content returned by provider");
  }

  // 4. Delegate to Feedback Ingestion & Deduplication Service
  const ingestionService = new FeedbackIngestionService(supabase as any);
  const summary = await ingestionService.ingestFromScrape({
    organizationId,
    sourceId,
    sourceUrl: scrapeResult.url,
    sourceType,
    rawHtml: scrapeResult.html,
    rawText: scrapeResult.markdown || scrapeResult.text || "",
    httpStatus: scrapeResult.statusCode,
    monitoringTargetId,
  });

  return summary;
}
