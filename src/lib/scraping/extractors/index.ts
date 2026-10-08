import { SourceType } from "@/types/database.types";
import { BaseExtractor } from "./base";
import { TrustpilotExtractor } from "./trustpilot";
import { GoogleMapsExtractor } from "./google-maps";
import { YelpExtractor } from "./yelp";
import { ForumRedditExtractor } from "./reddit";
import { CxArticleExtractor } from "./article";
import { GenericWebExtractor } from "./generic-website";
import { ExtractionResult } from "../types";

export * from "./base";
export * from "./trustpilot";
export * from "./google-maps";
export * from "./yelp";
export * from "./reddit";
export * from "./article";
export * from "./generic-website";

/**
 * ExtractorRegistry implements the Strategy pattern for feedback extraction.
 * Enables runtime registration, inspection, and hot-swapping of source-specific extraction engines.
 */
export class ExtractorRegistry {
  private static instance: ExtractorRegistry;
  private extractors: Map<SourceType, BaseExtractor> = new Map();
  private defaultExtractor: BaseExtractor;

  private constructor() {
    this.defaultExtractor = new GenericWebExtractor();

    // Register built-in default extractors
    this.register(new TrustpilotExtractor());
    this.register(new GoogleMapsExtractor());
    this.register(new YelpExtractor());
    this.register(new ForumRedditExtractor());
    this.register(new CxArticleExtractor());
    this.register(this.defaultExtractor);
  }

  /**
   * Retrieves the global singleton registry instance.
   */
  public static getInstance(): ExtractorRegistry {
    if (!ExtractorRegistry.instance) {
      ExtractorRegistry.instance = new ExtractorRegistry();
    }
    return ExtractorRegistry.instance;
  }

  /**
   * Registers or replaces an extractor for its target sourceType.
   */
  public register(extractor: BaseExtractor): void {
    this.extractors.set(extractor.sourceType, extractor);
  }

  /**
   * Unregisters an extractor for a given sourceType, reverting to default fallback.
   */
  public unregister(sourceType: SourceType): boolean {
    if (sourceType === "generic_web") return false; // Prevent removing root fallback
    return this.extractors.delete(sourceType);
  }

  /**
   * Gets the appropriate extractor for the given source type.
   * Falls back to GenericWebExtractor if no specialized extractor is registered.
   */
  public get(sourceType: SourceType): BaseExtractor {
    return this.extractors.get(sourceType) || this.defaultExtractor;
  }

  /**
   * Checks if a dedicated specialized extractor exists for the source type.
   */
  public hasSpecialized(sourceType: SourceType): boolean {
    return this.extractors.has(sourceType) && sourceType !== "generic_web";
  }

  /**
   * Lists all currently registered source types.
   */
  public getRegisteredTypes(): SourceType[] {
    return Array.from(this.extractors.keys());
  }

  /**
   * Resets registry to default configuration.
   */
  public resetToDefaults(): void {
    this.extractors.clear();
    this.defaultExtractor = new GenericWebExtractor();
    this.register(new TrustpilotExtractor());
    this.register(new GoogleMapsExtractor());
    this.register(new YelpExtractor());
    this.register(new ForumRedditExtractor());
    this.register(new CxArticleExtractor());
    this.register(this.defaultExtractor);
  }
}

/**
 * Returns the specialized extractor for the specified source type,
 * falling back to the GenericWebExtractor if no specialized extractor exists.
 */
export function getExtractorForSourceType(sourceType: SourceType): BaseExtractor {
  return ExtractorRegistry.getInstance().get(sourceType);
}

/**
 * Extracts structured customer feedback from raw HTML using the appropriate extractor.
 */
export function extractFeedback(
  sourceType: SourceType,
  html: string,
  pageUrl: string
): ExtractionResult {
  const extractor = getExtractorForSourceType(sourceType);
  return extractor.extract(html, pageUrl);
}
