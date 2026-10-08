import crypto from "crypto";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database, SourceType, Json } from "@/types/database.types";
import { NormalizedFeedbackItem } from "@/types/feedback.types";
import { ExtractorRegistry, BaseExtractor } from "../scraping/extractors";
import { FeedbackDeduplicator, DeduplicationResult } from "./deduplication";

export interface IngestOptions {
  organizationId: string;
  sourceId: string;
  sourceUrl: string;
  sourceType: SourceType;
  rawHtml: string;
  rawText?: string;
  httpStatus?: number;
  monitoringTargetId?: string;
  customExtractor?: BaseExtractor;
}

export interface IngestionExecutionSummary {
  ingestionRunId: string;
  rawScrapeId: string;
  sourceType: SourceType;
  sourceUrl: string;
  contentHash: string;
  metrics: {
    totalExtracted: number;
    inBatchDuplicates: number;
    dbDuplicates: number;
    newCount: number;
    updatedCount: number;
  };
  persistedItemsCount: number;
  durationMs: number;
}

/**
 * FeedbackIngestionService
 *
 * Coordinates the full extraction, canonical normalization, deduplication,
 * and persistence pipeline between raw crawl data and Supabase storage.
 *
 * Architecture Flow:
 * Raw Source Content ↓ Extraction ↓ Canonical Normalization ↓ Deduplication ↓ Supabase
 */
export class FeedbackIngestionService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Ingests raw HTML/content, runs extraction and normalization,
   * performs two-tier deduplication, and persists to the database.
   */
  public async ingestFromScrape(options: IngestOptions): Promise<IngestionExecutionSummary> {
    const startTime = Date.now();
    const {
      organizationId,
      sourceId,
      sourceUrl,
      sourceType,
      rawHtml,
      rawText = "",
      httpStatus = 200,
      monitoringTargetId = null,
      customExtractor,
    } = options;

    const pageContentHash = crypto
      .createHash("sha256")
      .update(rawHtml || rawText)
      .digest("hex");

    // 1. Initialize Ingestion Run Record for audit and observability
    const { data: ingestionRun, error: runError } = await this.supabase
      .from("ingestion_runs")
      .insert({
        organization_id: organizationId,
        source_id: sourceId,
        monitoring_target_id: monitoringTargetId,
        status: "extracting",
        fetch_url: sourceUrl,
        http_status: httpStatus,
        content_hash: pageContentHash,
        items_extracted: 0,
        items_new: 0,
        items_duplicate: 0,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (runError || !ingestionRun) {
      throw new Error(`Failed to create ingestion run record: ${runError?.message}`);
    }

    const ingestionRunId = ingestionRun.id;

    try {
      // 2. Select Extractor Strategy
      const extractor = customExtractor || ExtractorRegistry.getInstance().get(sourceType);

      // 3. Extract Raw Feedback Items
      const extractionResult = extractor.extract(rawHtml || rawText, sourceUrl);

      // 4. Tier 1: In-Batch Deduplication (Filters redundant DOM structures)
      const { unique: uniqueBatchItems, inBatchDuplicates } =
        FeedbackDeduplicator.deduplicateBatch(extractionResult.items);

      // 5. Persist Raw Scrape snapshot for full provenance & re-extraction capabilities
      const { data: rawScrape, error: scrapeError } = await this.supabase
        .from("raw_scrapes")
        .insert({
          organization_id: organizationId,
          source_id: sourceId,
          source_url: sourceUrl,
          http_status: httpStatus,
          content_hash: pageContentHash,
          raw_html: rawHtml,
          raw_text: rawText,
          metadata: {
            extractorUsed: extractor.sourceType,
            totalItemsExtracted: extractionResult.totalExtracted,
            inBatchDuplicates,
            pageTitle: extractionResult.pageTitle,
          } as Json,
          fetched_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (scrapeError || !rawScrape) {
        throw new Error(`Failed to persist raw scrape: ${scrapeError?.message}`);
      }

      const rawScrapeId = rawScrape.id;

      // 6. Map to Canonical Normalized Feedback Item Model
      const canonicalCandidates: NormalizedFeedbackItem[] = uniqueBatchItems.map((item) => ({
        organization_id: organizationId,
        source_id: sourceId,
        raw_scrape_id: rawScrapeId,
        ingestion_run_id: ingestionRunId,
        external_id: item.externalId,
        source_type: sourceType,
        feedback_type: item.feedbackType,
        content_text: item.contentText,
        rating: item.rating,
        author_display_name: item.authorDisplayName,
        author_identifier: item.authorIdentifier,
        posted_at: item.postedAt,
        language_code: item.languageCode,
        word_count: item.wordCount,
        content_hash: item.contentHash,
        raw_payload: item.rawPayload,
      }));

      // 7. Tier 2: Database Deduplication & Content Revision Detection
      const dedupResult: DeduplicationResult =
        await FeedbackDeduplicator.deduplicateAgainstDatabase(
          this.supabase,
          organizationId,
          sourceId,
          canonicalCandidates
        );

      // 8. Persist New Unique Feedback Items
      if (dedupResult.newItems.length > 0) {
        const { error: insertError } = await this.supabase.from("feedback_items").insert(
          dedupResult.newItems.map((item) => ({
            organization_id: item.organization_id,
            source_id: item.source_id,
            raw_scrape_id: item.raw_scrape_id || null,
            ingestion_run_id: item.ingestion_run_id || null,
            external_id: item.external_id || null,
            author_display_name: item.author_display_name || null,
            author_identifier: item.author_identifier,
            posted_at: item.posted_at || null,
            content_text: item.content_text,
            rating: item.rating || null,
            language_code: item.language_code,
            source_type: item.source_type,
            feedback_type: item.feedback_type || "review",
            word_count: item.word_count,
            content_hash: item.content_hash,
            raw_payload: (item.raw_payload as unknown as Json) || {},
            topics: [],
            key_entities: {},
          }))
        );

        if (insertError) {
          throw new Error(`Failed to persist new feedback items: ${insertError.message}`);
        }
      }

      // 9. Update Modified / Revised Feedback Items (e.g. Edited Reviews)
      if (dedupResult.updatedItems.length > 0) {
        for (const updatedItem of dedupResult.updatedItems) {
          if (updatedItem.id) {
            await this.supabase
              .from("feedback_items")
              .update({
                content_text: updatedItem.content_text,
                rating: updatedItem.rating || null,
                content_hash: updatedItem.content_hash,
                word_count: updatedItem.word_count,
                raw_payload: (updatedItem.raw_payload as unknown as Json) || {},
                updated_at: new Date().toISOString(),
              })
              .eq("id", updatedItem.id);
          }
        }
      }

      const durationMs = Date.now() - startTime;
      const totalDuplicates = inBatchDuplicates + dedupResult.duplicateItems.length;

      // 10. Mark Ingestion Run Completed
      await this.supabase
        .from("ingestion_runs")
        .update({
          status: "completed",
          items_extracted: extractionResult.totalExtracted,
          items_new: dedupResult.newItems.length,
          items_duplicate: totalDuplicates,
          execution_duration_ms: durationMs,
          completed_at: new Date().toISOString(),
        })
        .eq("id", ingestionRunId);

      return {
        ingestionRunId,
        rawScrapeId,
        sourceType,
        sourceUrl,
        contentHash: pageContentHash,
        metrics: {
          totalExtracted: extractionResult.totalExtracted,
          inBatchDuplicates,
          dbDuplicates: dedupResult.duplicateItems.length,
          newCount: dedupResult.newItems.length,
          updatedCount: dedupResult.updatedItems.length,
        },
        persistedItemsCount: dedupResult.newItems.length + dedupResult.updatedItems.length,
        durationMs,
      };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const durationMs = Date.now() - startTime;

      // Record failure on the ingestion run
      await this.supabase
        .from("ingestion_runs")
        .update({
          status: "failed",
          error_message: errorMessage,
          execution_duration_ms: durationMs,
          completed_at: new Date().toISOString(),
        })
        .eq("id", ingestionRunId);

      throw err;
    }
  }
}
