import { SourceType } from "./types";

/**
 * Normalizes a URL to prevent duplicate sources:
 * - Strips common tracking parameters (UTM, fbclid, etc.)
 * - Strips protocol (http -> https)
 * - Removes www prefix
 * - Standardizes trailing slashes
 * - Resolves lowercase domain
 */
export function canonicalizeUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);

    // Force HTTPS
    url.protocol = "https:";

    // Lowercase hostname and remove www.
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");

    // Strip common tracking parameters
    const paramsToRemove = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "fbclid",
      "gclid",
      "_ga",
      "ref",
      "source",
    ];

    for (const param of paramsToRemove) {
      url.searchParams.delete(param);
    }

    // Standardize path (remove trailing slash)
    let path = url.pathname;
    if (path.length > 1 && path.endsWith("/")) {
      path = path.slice(0, -1);
      url.pathname = path;
    }

    let result = url.toString();
    if (result.endsWith("/") && (url.pathname === "/" || url.pathname === "")) {
      result = result.slice(0, -1);
    }
    return result;
  } catch {
    // If invalid URL, return trimmed original
    return rawUrl.trim();
  }
}

/**
 * Classifies a discovered URL into a known SourceType
 */
export function classifySourceType(urlStr: string): SourceType {
  const url = urlStr.toLowerCase();

  if (url.includes("trustpilot.com/review")) return "trustpilot";
  if (url.includes("google.com/maps") || url.includes("maps.google.com")) return "google_maps";
  if (url.includes("g2.com/products")) return "g2";
  if (url.includes("capterra.com/p/")) return "capterra";
  if (url.includes("yelp.com/biz/")) return "yelp";
  if (url.includes("reddit.com/r/")) return "reddit";
  if (url.includes("apps.apple.com/")) return "app_store";
  if (url.includes("play.google.com/store/apps/")) return "play_store";

  return "generic_web";
}

export interface ProfileMatchingContext {
  companyName: string;
  domain?: string;
  country?: string;
  industry?: string;
  aliases?: string[];
  locations?: Array<{ city: string; country: string }>;
}

/**
 * Calculates a confidence score (0.0 - 1.0) and provides a reason for candidate sources
 */
export function evaluateCandidateConfidence(
  url: string,
  title: string,
  snippet: string,
  context: ProfileMatchingContext
): { confidence: number; reason: string; verificationStatus: "unverified" | "verified_auto" | "rejected" } {
  let score = 0.5; // Base confidence
  const reasons: string[] = [];

  const textToScan = `${title} ${snippet} ${url}`.toLowerCase();
  const normalizedName = context.companyName.toLowerCase();

  // 1. Direct Name Match
  if (textToScan.includes(normalizedName)) {
    score += 0.25;
    reasons.push(`Title/Snippet contains exact company name "${context.companyName}"`);
  } else {
    // Check aliases
    const matchedAlias = context.aliases?.find(a => textToScan.includes(a.toLowerCase()));
    if (matchedAlias) {
      score += 0.2;
      reasons.push(`Matched known alias "${matchedAlias}"`);
    } else {
      score -= 0.15;
      reasons.push("Missing direct company name or alias match");
    }
  }

  // 2. Domain Match (Extremely high signal)
  if (context.domain) {
    const cleanDomain = context.domain.toLowerCase().replace(/^www\./, "");
    if (textToScan.includes(cleanDomain)) {
      score += 0.3;
      reasons.push(`Contains official primary domain "${cleanDomain}"`);
    }
  }

  // 3. Location Disambiguation (Crucial for preventing false positives)
  if (context.locations && context.locations.length > 0) {
    const matchedLocation = context.locations.some(loc =>
      textToScan.includes(loc.city.toLowerCase()) ||
      textToScan.includes(loc.country.toLowerCase())
    );

    if (matchedLocation) {
      score += 0.15;
      reasons.push("Matches expected geographic location/city");
    } else if (context.country && textToScan.includes(context.country.toLowerCase())) {
      score += 0.1;
      reasons.push(`Matches company country "${context.country}"`);
    }
  }

  // Cap score between 0.0 and 1.0
  const finalScore = Math.max(0.0, Math.min(1.0, parseFloat(score.toFixed(2))));

  let status: "unverified" | "verified_auto" | "rejected" = "unverified";
  if (finalScore >= 0.85) {
    status = "verified_auto";
  } else if (finalScore < 0.3) {
    status = "rejected";
  }

  return {
    confidence: finalScore,
    reason: reasons.join("; ") || "General heuristic matching",
    verificationStatus: status,
  };
}
