import { SourceType } from "@/types/database.types";
import { BaseExtractor } from "./base";
import { TrustpilotExtractor } from "./trustpilot";
import { GoogleMapsExtractor } from "./google-maps";
import { YelpExtractor } from "./yelp";
import { GenericWebExtractor } from "./generic-website";
import { ExtractionResult } from "../types";

export * from "./base";
export * from "./trustpilot";
export * from "./google-maps";
export * from "./yelp";
export * from "./generic-website";

// Extractor singleton instances
const trustpilotExtractor = new TrustpilotExtractor();
const googleMapsExtractor = new GoogleMapsExtractor();
const yelpExtractor = new YelpExtractor();
const genericWebExtractor = new GenericWebExtractor();

const extractorMap: Record<SourceType, BaseExtractor> = {
  trustpilot: trustpilotExtractor,
  google_maps: googleMapsExtractor,
  yelp: yelpExtractor,
  generic_web: genericWebExtractor,
  g2: genericWebExtractor, // G2 / Capterra fallback to generic until specialized extractor in future phase
  capterra: genericWebExtractor,
  app_store: genericWebExtractor,
  play_store: genericWebExtractor,
  reddit: genericWebExtractor,
};

/**
 * Returns the specialized extractor for the specified source type,
 * falling back to the GenericWebExtractor if no specialized extractor exists.
 */
export function getExtractorForSourceType(sourceType: SourceType): BaseExtractor {
  return extractorMap[sourceType] || genericWebExtractor;
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
