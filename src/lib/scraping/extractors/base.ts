import crypto from "crypto";
import { SourceType } from "@/types/database.types";
import { ExtractedFeedback, ExtractionResult } from "../types";

export abstract class BaseExtractor {
  public abstract readonly sourceType: SourceType;

  /**
   * Primary entrypoint: extracts structured customer feedback from raw HTML.
   */
  public abstract extract(html: string, pageUrl: string): ExtractionResult;

  /**
   * Computes a deterministic SHA-256 author identifier.
   * ZERO-PII RULE:
   * The real author name and profile URL are NEVER stored in the database.
   * We hash them with the sourceType salt to allow tracking multiple reviews from the same
   * pseudonymized entity while mathematically preventing reverse-engineering of user identity.
   */
  public anonymizeAuthor(
    rawName?: string,
    profileUrl?: string
  ): string {
    const salt = "cxpulse_author_pseudonym_v1";
    const cleanName = (rawName || "anonymous").trim().toLowerCase();
    const cleanUrl = (profileUrl || "").trim().toLowerCase();

    return crypto
      .createHash("sha256")
      .update(`${this.sourceType}:${salt}:${cleanName}:${cleanUrl}`)
      .digest("hex");
  }

  /**
   * Computes a deterministic SHA-256 content hash for deduplication.
   * Ensures identical feedback items from repeat crawls do not create duplicates.
   */
  public computeContentHash(
    contentText: string,
    authorIdentifier: string,
    postedAt?: string
  ): string {
    const normalizedText = contentText
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

    return crypto
      .createHash("sha256")
      .update(`${this.sourceType}:${authorIdentifier}:${normalizedText}:${postedAt || ""}`)
      .digest("hex");
  }

  /**
   * Strips HTML tags, decodes common entities, and removes control characters.
   */
  public sanitizeText(raw: string): string {
    if (!raw) return "";

    return raw
      .replace(/<[^>]*>/g, " ") // Strip HTML tags
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // Strip non-printable ASCII control chars
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Counts words in normalized text.
   */
  public countWords(text: string): number {
    const trimmed = text.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
  }

  /**
   * Builds a normalized ExtractedFeedback object.
   */
  protected buildFeedbackItem(params: {
    rawAuthorName?: string;
    rawAuthorUrl?: string;
    contentText: string;
    rating?: number;
    postedAt?: string;
    languageCode?: string;
    metadata?: Record<string, unknown>;
  }): ExtractedFeedback | null {
    const cleanText = this.sanitizeText(params.contentText);
    if (!cleanText || cleanText.length < 5) {
      return null;
    }

    const authorIdentifier = this.anonymizeAuthor(
      params.rawAuthorName,
      params.rawAuthorUrl
    );

    const contentHash = this.computeContentHash(
      cleanText,
      authorIdentifier,
      params.postedAt
    );

    return {
      authorIdentifier,
      postedAt: params.postedAt,
      contentText: cleanText,
      rating: params.rating ? Math.max(1, Math.min(5, params.rating)) : undefined,
      languageCode: params.languageCode || "en",
      sourceType: this.sourceType,
      wordCount: this.countWords(cleanText),
      contentHash,
      metadata: params.metadata || {},
    };
  }
}
