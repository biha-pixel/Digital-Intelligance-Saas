import {
  CandidateMetadataInput,
  OwnershipRelationship,
  SourceSubtype,
  StructuredEvidence,
  VerificationContext,
  VerificationResult,
  VerificationSignal,
  VerificationStatus,
} from "./types";
import { SourceType } from "@/types/database.types";
import { classifySourceType } from "@/lib/discovery/utils";
import {
  deepCanonicalizeUrl,
  RedirectResolver,
  StaticRedirectResolver,
} from "./redirects";

/**
 * Multi-Factor Source Verification Engine
 * Validates candidate sources against profile context, location, domains,
 * and structured metadata without falsely claiming third-party ownership.
 */
export class SourceVerificationEngine {
  private redirectResolver: RedirectResolver;

  constructor(redirectResolver?: RedirectResolver) {
    this.redirectResolver = redirectResolver || new StaticRedirectResolver();
  }

  /**
   * Evaluates and verifies a candidate source URL
   */
  async verifyCandidate(
    inputUrl: string,
    context: VerificationContext,
    metadata?: CandidateMetadataInput
  ): Promise<VerificationResult> {
    const { canonicalUrl, redirectChain, finalUrl } =
      await this.redirectResolver.resolveRedirects(inputUrl);

    const deepCanonical = deepCanonicalizeUrl(canonicalUrl);
    const sourceType = classifySourceType(deepCanonical);
    const parsedUrl = new URL(deepCanonical);
    const hostname = parsedUrl.hostname.toLowerCase();
    const pathname = parsedUrl.pathname.toLowerCase();

    const signals: VerificationSignal[] = [];
    let confidenceScore = 0.5; // Neutral starting base
    const reasons: string[] = [];

    // =========================================================================
    // 1. Ownership & Subtype Determination (Prevent False Ownership Claims)
    // =========================================================================
    const { ownership, subtype } = this.determineOwnershipAndSubtype(
      hostname,
      pathname,
      sourceType,
      context
    );

    // =========================================================================
    // 2. Domain Match Evidence
    // =========================================================================
    let domainMatchResult: StructuredEvidence["domainMatch"] = {
      matched: false,
    };

    if (context.primaryDomain) {
      const cleanExpectedDomain = context.primaryDomain
        .toLowerCase()
        .replace(/^www\./, "")
        .trim();

      if (hostname === cleanExpectedDomain) {
        domainMatchResult = {
          matched: true,
          expectedDomain: cleanExpectedDomain,
          actualDomain: hostname,
          isSubdomain: false,
        };
        confidenceScore += 0.4;
        signals.push({
          name: "exact_domain_match",
          weight: 0.4,
          score: 1.0,
          matched: true,
          reason: `Exact domain match on official primary domain "${cleanExpectedDomain}"`,
        });
        reasons.push(`Exact match on primary domain "${cleanExpectedDomain}"`);
      } else if (hostname.endsWith(`.${cleanExpectedDomain}`)) {
        domainMatchResult = {
          matched: true,
          expectedDomain: cleanExpectedDomain,
          actualDomain: hostname,
          isSubdomain: true,
        };
        confidenceScore += 0.35;
        signals.push({
          name: "subdomain_match",
          weight: 0.35,
          score: 0.9,
          matched: true,
          reason: `Subdomain of official primary domain "${cleanExpectedDomain}"`,
        });
        reasons.push(`Subdomain of primary domain "${cleanExpectedDomain}"`);
      } else if (pathname.includes(cleanExpectedDomain)) {
        // e.g., trustpilot.com/review/acme.com
        domainMatchResult = {
          matched: true,
          expectedDomain: cleanExpectedDomain,
          actualDomain: hostname,
        };
        confidenceScore += 0.35;
        signals.push({
          name: "platform_path_domain_match",
          weight: 0.35,
          score: 0.95,
          matched: true,
          reason: `Third-party platform path references verified domain "${cleanExpectedDomain}"`,
        });
        reasons.push(`Platform directory references primary domain "${cleanExpectedDomain}"`);
      } else {
        domainMatchResult = {
          matched: false,
          expectedDomain: cleanExpectedDomain,
          actualDomain: hostname,
        };
        // Penalty only if claimed to be owned or website
        if (ownership === "owned" || sourceType === "generic_web") {
          confidenceScore -= 0.3;
          signals.push({
            name: "domain_mismatch",
            weight: 0.3,
            score: 0.0,
            matched: false,
            reason: `Target hostname "${hostname}" does not match primary domain "${cleanExpectedDomain}"`,
          });
          reasons.push(`Domain mismatch against official "${cleanExpectedDomain}"`);
        }
      }
    }

    // =========================================================================
    // 3. Name & Brand Mention Matching
    // =========================================================================
    const textBlob = `${metadata?.title || ""} ${metadata?.snippet || ""} ${metadata?.pageContent || ""} ${deepCanonical}`.toLowerCase();
    const normalizedName = context.companyName.toLowerCase();
    const hasNameMatch = textBlob.includes(normalizedName);
    const matchedAlias = context.aliases?.find((alias) =>
      textBlob.includes(alias.toLowerCase())
    );

    if (hasNameMatch) {
      confidenceScore += 0.25;
      signals.push({
        name: "company_name_match",
        weight: 0.25,
        score: 1.0,
        matched: true,
        reason: `Evidence text includes exact company name "${context.companyName}"`,
      });
      reasons.push(`Exact company name match for "${context.companyName}"`);
    } else if (matchedAlias) {
      confidenceScore += 0.2;
      signals.push({
        name: "company_alias_match",
        weight: 0.2,
        score: 0.85,
        matched: true,
        reason: `Evidence text matches known company alias "${matchedAlias}"`,
      });
      reasons.push(`Matched known alias "${matchedAlias}"`);
    } else if (ownership !== "owned" && !domainMatchResult.matched) {
      confidenceScore -= 0.25;
      signals.push({
        name: "missing_brand_identification",
        weight: 0.25,
        score: 0.0,
        matched: false,
        reason: `No reference to company name "${context.companyName}" or registered aliases`,
      });
      reasons.push("Missing company name or alias in candidate evidence");
    }

    // =========================================================================
    // 4. Geographic & Location Disambiguation (False Positive Defense)
    // =========================================================================
    let locationMatchResult: StructuredEvidence["locationMatch"] = {
      matched: false,
    };

    if (context.locations && context.locations.length > 0) {
      const targetCities = context.locations.map((l) => l.city.toLowerCase());
      const targetCountries = context.locations.map((l) => l.country.toLowerCase());

      const detectedLocationStr = (
        metadata?.detectedLocation ||
        metadata?.snippet ||
        metadata?.pageContent ||
        ""
      ).toLowerCase();

      const matchedCity = targetCities.find((c) => detectedLocationStr.includes(c));
      const matchedCountry = targetCountries.find((co) =>
        detectedLocationStr.includes(co)
      );

      if (matchedCity) {
        locationMatchResult = {
          matched: true,
          expectedCity: matchedCity,
          detectedLocation: detectedLocationStr,
        };
        confidenceScore += 0.2;
        signals.push({
          name: "geo_location_match",
          weight: 0.2,
          score: 1.0,
          matched: true,
          reason: `Matched verified branch/headquarters city "${matchedCity}"`,
        });
        reasons.push(`Matched company location city "${matchedCity}"`);
      } else if (matchedCountry) {
        locationMatchResult = {
          matched: true,
          expectedCountry: matchedCountry,
          detectedLocation: detectedLocationStr,
        };
        confidenceScore += 0.1;
        signals.push({
          name: "geo_country_match",
          weight: 0.1,
          score: 0.7,
          matched: true,
          reason: `Matched registered country "${matchedCountry}"`,
        });
        reasons.push(`Matched registered country "${matchedCountry}"`);
      } else if (
        metadata?.detectedLocation &&
        !matchedCity &&
        !matchedCountry &&
        sourceType === "google_maps"
      ) {
        // Severe false positive check for local business listings with same name in wrong city
        confidenceScore -= 0.45;
        signals.push({
          name: "geo_location_mismatch",
          weight: 0.45,
          score: 0.0,
          matched: false,
          reason: `Detected business listing location "${metadata.detectedLocation}" conflicts with registered locations (${targetCities.join(", ")})`,
        });
        reasons.push(`Geographic mismatch: listing in "${metadata.detectedLocation}"`);
      }
    }

    // =========================================================================
    // 5. Social Profile Matching
    // =========================================================================
    let socialMatchResult: StructuredEvidence["socialMatch"] = {
      matched: false,
    };

    if (subtype === "social_profile" && context.socialHandles) {
      const socialCheck = this.evaluateSocialProfile(
        hostname,
        pathname,
        context.socialHandles
      );
      socialMatchResult = socialCheck;

      if (socialCheck.matched) {
        confidenceScore += 0.35;
        signals.push({
          name: "social_handle_match",
          weight: 0.35,
          score: 1.0,
          matched: true,
          reason: `Matched verified ${socialCheck.platform} handle "@${socialCheck.expectedHandle}"`,
        });
        reasons.push(`Verified official ${socialCheck.platform} account`);
      } else if (socialCheck.expectedHandle) {
        confidenceScore -= 0.3;
        signals.push({
          name: "social_handle_mismatch",
          weight: 0.3,
          score: 0.0,
          matched: false,
          reason: `Candidate profile path "${pathname}" does not match registered handle "@${socialCheck.expectedHandle}"`,
        });
        reasons.push(`Social handle mismatch on ${socialCheck.platform}`);
      }
    }

    // =========================================================================
    // 6. Structured Schema.org / JSON-LD / OpenGraph Evidence
    // =========================================================================
    let schemaOrgResult: StructuredEvidence["schemaOrg"] = {
      detected: false,
    };

    if (metadata?.schemaOrg) {
      schemaOrgResult = {
        detected: true,
        entityName: metadata.schemaOrg.entityName,
        url: metadata.schemaOrg.url,
        sameAs: metadata.schemaOrg.sameAs,
        rawJsonLd: metadata.schemaOrg.rawJsonLd,
      };

      if (
        metadata.schemaOrg.entityName &&
        metadata.schemaOrg.entityName.toLowerCase().includes(normalizedName)
      ) {
        confidenceScore += 0.2;
        signals.push({
          name: "schema_org_entity_match",
          weight: 0.2,
          score: 1.0,
          matched: true,
          reason: `Schema.org JSON-LD Organization name matches "${metadata.schemaOrg.entityName}"`,
        });
        reasons.push(`Structured Schema.org entity name confirmed`);
      }

      if (
        metadata.schemaOrg.url &&
        context.primaryDomain &&
        metadata.schemaOrg.url.toLowerCase().includes(context.primaryDomain.toLowerCase())
      ) {
        confidenceScore += 0.15;
        signals.push({
          name: "schema_org_url_match",
          weight: 0.15,
          score: 1.0,
          matched: true,
          reason: `Schema.org JSON-LD url property points to primary domain`,
        });
        reasons.push(`Schema.org URL references primary domain`);
      }
    }

    // =========================================================================
    // 7. Final Score Computation & Status Classification
    // =========================================================================
    const boundedConfidence = Math.max(
      0.0,
      Math.min(1.0, parseFloat(confidenceScore.toFixed(2)))
    );

    let verificationStatus: VerificationStatus = "unverified";
    let finalOwnership = ownership;

    if (boundedConfidence >= 0.85) {
      verificationStatus = "verified_auto";
    } else if (boundedConfidence < 0.35) {
      verificationStatus = "rejected";
      finalOwnership = "irrelevant";
    } else {
      verificationStatus = "unverified";
      if (finalOwnership !== "owned" && finalOwnership !== "official" && finalOwnership !== "third_party") {
        finalOwnership = "uncertain";
      }
    }

    const evidence: StructuredEvidence = {
      canonicalUrl: deepCanonical,
      originalInputUrl: inputUrl,
      redirectChain,
      finalDestinationUrl: finalUrl,
      domainMatch: domainMatchResult,
      locationMatch: locationMatchResult,
      socialMatch: socialMatchResult,
      schemaOrg: schemaOrgResult,
      openGraph: metadata?.openGraph,
      signals,
      evaluatedAt: new Date().toISOString(),
      evaluationMethod: "heuristic_engine",
    };

    return {
      canonicalUrl: deepCanonical,
      sourceType,
      sourceSubtype: subtype,
      ownership: finalOwnership,
      verificationStatus,
      confidence: boundedConfidence,
      evidence,
      summaryReason: reasons.join("; ") || "Heuristic evidence evaluation",
      isEligibleForIngestion: verificationStatus === "verified_auto",
    };
  }

  /**
   * Determines ownership relationship and source subtype based on host & path.
   * Strictly guarantees that 3rd-party review directories and forums are NOT marked 'owned'.
   */
  private determineOwnershipAndSubtype(
    hostname: string,
    pathname: string,
    sourceType: SourceType,
    context: VerificationContext
  ): { ownership: OwnershipRelationship; subtype: SourceSubtype } {
    const cleanPrimaryDomain = context.primaryDomain
      ?.toLowerCase()
      .replace(/^www\./, "");

    // 1. Primary Website & Owned Subdomains
    if (
      cleanPrimaryDomain &&
      (hostname === cleanPrimaryDomain || hostname.endsWith(`.${cleanPrimaryDomain}`))
    ) {
      if (pathname.includes("/doc") || hostname.startsWith("docs.")) {
        return { ownership: "owned", subtype: "documentation" };
      }
      if (pathname.includes("/blog") || hostname.startsWith("blog.")) {
        return { ownership: "owned", subtype: "blog" };
      }
      return { ownership: "owned", subtype: "primary_website" };
    }

    // 2. Official Social Accounts
    if (
      hostname.includes("twitter.com") ||
      hostname.includes("x.com") ||
      hostname.includes("linkedin.com") ||
      hostname.includes("github.com") ||
      hostname.includes("instagram.com") ||
      hostname.includes("youtube.com") ||
      hostname.includes("facebook.com")
    ) {
      return { ownership: "official", subtype: "social_profile" };
    }

    // 3. Third-Party Review Directories & Platforms
    if (sourceType === "trustpilot") {
      return { ownership: "third_party", subtype: "public_reviews" };
    }
    if (sourceType === "g2" || sourceType === "capterra") {
      return { ownership: "third_party", subtype: "b2b_software_reviews" };
    }
    if (sourceType === "google_maps" || sourceType === "yelp") {
      return { ownership: "third_party", subtype: "geo_business_listing" };
    }
    if (sourceType === "reddit") {
      return { ownership: "third_party", subtype: "community_forum" };
    }
    if (sourceType === "app_store" || sourceType === "play_store") {
      return { ownership: "third_party", subtype: "mobile_app_listing" };
    }

    // 4. Default generic web candidate
    return { ownership: "uncertain", subtype: "unclassified" };
  }

  /**
   * Helper to check social handle matching
   */
  private evaluateSocialProfile(
    hostname: string,
    pathname: string,
    socialHandles: NonNullable<VerificationContext["socialHandles"]>
  ): {
    matched: boolean;
    platform?: string;
    expectedHandle?: string;
    detectedHandle?: string;
  } {
    const cleanPath = pathname.replace(/^\/+/, "").replace(/\/+$/, "").toLowerCase();

    if (hostname.includes("twitter.com") || hostname.includes("x.com")) {
      const expected = socialHandles.twitter?.toLowerCase().replace(/^@/, "");
      return {
        matched: Boolean(expected && cleanPath === expected),
        platform: "Twitter/X",
        expectedHandle: expected,
        detectedHandle: cleanPath,
      };
    }

    if (hostname.includes("github.com")) {
      const expected = socialHandles.github?.toLowerCase().replace(/^@/, "");
      return {
        matched: Boolean(expected && cleanPath === expected),
        platform: "GitHub",
        expectedHandle: expected,
        detectedHandle: cleanPath,
      };
    }

    if (hostname.includes("linkedin.com")) {
      const expected = socialHandles.linkedin?.toLowerCase();
      const isCompanyPath = cleanPath.includes("company/");
      const detected = isCompanyPath ? cleanPath.split("company/")[1] : cleanPath;
      return {
        matched: Boolean(expected && detected && detected.includes(expected)),
        platform: "LinkedIn",
        expectedHandle: expected,
        detectedHandle: detected,
      };
    }

    return { matched: false };
  }
}
