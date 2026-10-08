import { SourceType } from "@/types/database.types";

/**
 * Ownership Relationship Taxonomy
 * - owned: Controlled, hosted, and operated directly by the company (e.g., official website, docs, subdomains).
 * - official: Verified/administered company profiles on external platforms (e.g., official @acme Twitter, verified LinkedIn page).
 * - third_party: Unowned public platforms hosting consumer reviews, directory ratings, and community forums (e.g., Trustpilot, G2, Google Maps, Reddit).
 * - uncertain: Ambiguous evidence or borderline match requiring human analyst inspection.
 * - irrelevant: False positive, unrelated company with name collision, or junk URL.
 */
export type OwnershipRelationship =
  | "owned"
  | "official"
  | "third_party"
  | "uncertain"
  | "irrelevant";

/**
 * Verification Status
 */
export type VerificationStatus =
  | "unverified"
  | "verified_auto"
  | "verified_manual"
  | "rejected";

/**
 * Structured Subtypes for fine-grained source categorization
 */
export type SourceSubtype =
  | "primary_website"
  | "documentation"
  | "blog"
  | "public_reviews"
  | "b2b_software_reviews"
  | "geo_business_listing"
  | "social_profile"
  | "community_forum"
  | "mobile_app_listing"
  | "unclassified";

/**
 * Verification Signal Details
 */
export interface VerificationSignal {
  name: string;
  weight: number; // 0.0 to 1.0
  score: number; // 0.0 to 1.0
  matched: boolean;
  reason: string;
}

/**
 * Structured Evidence Payload stored with each source
 */
export interface StructuredEvidence {
  canonicalUrl: string;
  originalInputUrl?: string;
  redirectChain?: string[];
  finalDestinationUrl?: string;
  domainMatch?: {
    matched: boolean;
    expectedDomain?: string;
    actualDomain?: string;
    isSubdomain?: boolean;
  };
  locationMatch?: {
    matched: boolean;
    expectedCity?: string;
    expectedCountry?: string;
    detectedLocation?: string;
    confidenceDelta?: number;
  };
  socialMatch?: {
    matched: boolean;
    platform?: string;
    expectedHandle?: string;
    detectedHandle?: string;
  };
  schemaOrg?: {
    detected: boolean;
    entityName?: string;
    url?: string;
    sameAs?: string[];
    rawJsonLd?: Record<string, unknown>;
  };
  openGraph?: {
    siteName?: string;
    title?: string;
    description?: string;
  };
  signals: VerificationSignal[];
  evaluatedAt: string;
  evaluationMethod: "heuristic_engine" | "manual_analyst" | "reverification";
}

/**
 * Target Profile Context used to verify candidates
 */
export interface VerificationContext {
  companyName: string;
  displayName?: string;
  primaryDomain?: string;
  industry?: string;
  country?: string;
  locations?: Array<{
    city: string;
    country: string;
    stateRegion?: string;
    address?: string;
  }>;
  aliases?: string[];
  socialHandles?: {
    twitter?: string;
    linkedin?: string;
    facebook?: string;
    instagram?: string;
    youtube?: string;
    github?: string;
  };
}

export interface CandidateMetadataInput {
  title?: string;
  snippet?: string;
  pageContent?: string;
  schemaOrg?: {
    entityName?: string;
    url?: string;
    sameAs?: string[];
    rawJsonLd?: Record<string, unknown>;
  };
  openGraph?: {
    siteName?: string;
    title?: string;
    description?: string;
  };
  detectedLocation?: string;
}

/**
 * Output of the Verification Engine
 */
export interface VerificationResult {
  canonicalUrl: string;
  sourceType: SourceType;
  sourceSubtype: SourceSubtype;
  ownership: OwnershipRelationship;
  verificationStatus: VerificationStatus;
  confidence: number;
  evidence: StructuredEvidence;
  summaryReason: string;
  isEligibleForIngestion: boolean;
}

/**
 * Registered Source Representation in Registry
 */
export interface RegisteredSource {
  id: string;
  organizationId: string;
  companyProfileId: string;
  canonicalUrl: string;
  displayName: string;
  sourceType: SourceType;
  sourceSubtype: SourceSubtype;
  ownership: OwnershipRelationship;
  verificationStatus: VerificationStatus;
  confidence: number;
  isActive: boolean;
  evidence: StructuredEvidence;
  lastVerifiedAt: string;
  createdAt: string;
  updatedAt: string;
}
