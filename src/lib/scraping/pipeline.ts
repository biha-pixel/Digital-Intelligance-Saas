import { validateUrlForScraping } from "../security/ssrf";
import { isCrawlable } from "./robots";
import { getScrapingProvider } from "./provider";
import { createAdminClient } from "@/lib/supabase/admin";
import { SourceType } from "@/types/database.types";
import { FeedbackIngestionService, IngestionExecutionSummary } from "../feedback/ingestion";

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
  monitoringTargetId?: string
): Promise<IngestionExecutionSummary> {
  const supabase = createAdminClient();

  // 1. SSRF Pre-flight Validation
  const ssrfCheck = await validateUrlForScraping(sourceUrl);
  if (!ssrfCheck.valid) {
    throw new Error(`SSRF check failed: ${ssrfCheck.error}`);
  }

  // 2. Robots.txt Compliance Check
  const allowed = await isCrawlable(ssrfCheck.normalizedUrl, "CXPulseBot/1.0");
  if (!allowed) {
    throw new Error("Blocked by robots.txt directive");
  }

  // 3. Provider Fetch Execution (Decoupled via ScrapingProvider)
  const provider = getScrapingProvider();
  const scrapeResult = await provider.fetch({ url: ssrfCheck.normalizedUrl });

  if (!scrapeResult.html && !scrapeResult.text) {
    throw new Error("Scraping failed: No content returned by provider");
  }

  // 4. Delegate to Feedback Ingestion & Deduplication Service
  const ingestionService = new FeedbackIngestionService(supabase);
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
