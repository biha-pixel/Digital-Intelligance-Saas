import { ExtractedFeedback } from "../scraping/types";
import { NormalizedFeedbackItem } from "@/types/feedback.types";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";

export interface DeduplicationResult {
  newItems: NormalizedFeedbackItem[];
  duplicateItems: NormalizedFeedbackItem[];
  updatedItems: NormalizedFeedbackItem[];
  metrics: {
    totalExtracted: number;
    inBatchDuplicates: number;
    dbDuplicates: number;
    newCount: number;
    updatedCount: number;
  };
}

/**
 * Deduplication Engine
 *
 * Provides two-tier deduplication:
 * 1. Tier 1: In-Memory / In-Batch Deduplication (filters duplicate DOM items in same page crawl)
 * 2. Tier 2: Database Cross-Crawl Deduplication & Revision Detection (checks existing content hashes & external IDs)
 */
export class FeedbackDeduplicator {
  /**
   * Deduplicates extracted items within a single batch memory buffer.
   * Discards repeated DOM blocks and duplicate external IDs within the same scrape.
   */
  public static deduplicateBatch(items: ExtractedFeedback[]): {
    unique: ExtractedFeedback[];
    inBatchDuplicates: number;
  } {
    const seenContentHashes = new Set<string>();
    const seenExternalIds = new Set<string>();
    const unique: ExtractedFeedback[] = [];
    let inBatchDuplicates = 0;

    for (const item of items) {
      if (seenContentHashes.has(item.contentHash)) {
        inBatchDuplicates++;
        continue;
      }

      if (item.externalId && seenExternalIds.has(item.externalId)) {
        inBatchDuplicates++;
        continue;
      }

      seenContentHashes.add(item.contentHash);
      if (item.externalId) {
        seenExternalIds.add(item.externalId);
      }
      unique.push(item);
    }

    return { unique, inBatchDuplicates };
  }

  /**
   * Compares candidate feedback items against existing database records.
   * Classifies items as new, unchanged duplicate, or updated revision.
   */
  public static async deduplicateAgainstDatabase(
    supabase: SupabaseClient<Database>,
    organizationId: string,
    sourceId: string,
    candidates: NormalizedFeedbackItem[]
  ): Promise<DeduplicationResult> {
    if (candidates.length === 0) {
      return {
        newItems: [],
        duplicateItems: [],
        updatedItems: [],
        metrics: {
          totalExtracted: 0,
          inBatchDuplicates: 0,
          dbDuplicates: 0,
          newCount: 0,
          updatedCount: 0,
        },
      };
    }

    const contentHashes = candidates.map((c) => c.content_hash);
    const externalIds = candidates
      .map((c) => c.external_id)
      .filter((id): id is string => Boolean(id));

    // 1. Query existing content hashes for this organization & source
    const { data: existingHashes } = await supabase
      .from("feedback_items")
      .select("id, content_hash, external_id")
      .eq("organization_id", organizationId)
      .eq("source_id", sourceId)
      .in("content_hash", contentHashes);

    const existingHashMap = new Map<string, string>(); // content_hash -> id
    if (existingHashes) {
      for (const row of existingHashes) {
        if (row.content_hash) {
          existingHashMap.set(row.content_hash, row.id);
        }
      }
    }

    // 2. Query existing external IDs to detect edited/revised reviews
    const existingExternalIdMap = new Map<string, { id: string; content_hash: string }>();
    if (externalIds.length > 0) {
      const { data: existingExt } = await supabase
        .from("feedback_items")
        .select("id, external_id, content_hash")
        .eq("organization_id", organizationId)
        .eq("source_id", sourceId)
        .in("external_id", externalIds);

      if (existingExt) {
        for (const row of existingExt) {
          if (row.external_id) {
            existingExternalIdMap.set(row.external_id, {
              id: row.id,
              content_hash: row.content_hash,
            });
          }
        }
      }
    }

    const newItems: NormalizedFeedbackItem[] = [];
    const duplicateItems: NormalizedFeedbackItem[] = [];
    const updatedItems: NormalizedFeedbackItem[] = [];

    for (const item of candidates) {
      // Exact content hash match -> Idempotent duplicate
      if (existingHashMap.has(item.content_hash)) {
        duplicateItems.push({
          ...item,
          id: existingHashMap.get(item.content_hash),
        });
        continue;
      }

      // Same external ID but different content hash -> Content Revision / Edited Review
      if (item.external_id && existingExternalIdMap.has(item.external_id)) {
        const existingRecord = existingExternalIdMap.get(item.external_id)!;
        updatedItems.push({
          ...item,
          id: existingRecord.id,
        });
        continue;
      }

      // Brand new item
      newItems.push(item);
    }

    return {
      newItems,
      duplicateItems,
      updatedItems,
      metrics: {
        totalExtracted: candidates.length,
        inBatchDuplicates: 0,
        dbDuplicates: duplicateItems.length,
        newCount: newItems.length,
        updatedCount: updatedItems.length,
      },
    };
  }
}
