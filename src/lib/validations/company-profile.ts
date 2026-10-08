import { z } from "zod";

/**
 * Standardized Industry Verticals for CX Intelligence Benchmarking
 */
export const INDUSTRY_OPTIONS = [
  "B2B SaaS & Software",
  "E-Commerce & Retail",
  "Fintech & Financial Services",
  "Healthcare & MedTech",
  "Hospitality, Dining & Travel",
  "Consumer Tech & Hardware",
  "Logistics & Supply Chain",
  "Professional & Legal Services",
  "Media, Gaming & Entertainment",
  "Education & EdTech",
  "Other",
] as const;

export const COUNTRY_OPTIONS = [
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "GB", name: "United Kingdom" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "AU", name: "Australia" },
  { code: "IN", name: "India" },
  { code: "JP", name: "Japan" },
  { code: "SG", name: "Singapore" },
  { code: "NL", name: "Netherlands" },
  { code: "BR", name: "Brazil" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "CH", name: "Switzerland" },
  { code: "SE", name: "Sweden" },
  { code: "GLOBAL", name: "Global / Multi-National" },
] as const;

/**
 * Strategic Field Rationales
 * Educational intelligence explaining why each piece of metadata is collected.
 */
export const FIELD_EXPLANATIONS = {
  companyName:
    "Primary entity name used as the baseline search key across discovery indexes and review directories.",
  displayName:
    "Public-facing trade name displayed across dashboard reports, executive briefs, and notification alerts.",
  primaryDomain:
    "Enables automated verification of customer review platforms, sitemaps, Trustpilot pages, and verified domain footprints.",
  country:
    "Calibrates regional sentiment baselines, regulatory consumer rights frameworks, and localized language models.",
  industry:
    "Allows our AI engine to benchmark your customer sentiment against industry-specific cohort baselines and competitor norms.",
  locations:
    "Powers geo-targeted review ingestion across Google Maps, Yelp, and regional business directories for multi-branch operations.",
  aliases:
    "Captures sub-brands, trade names, and legacy aliases to eliminate false negatives when customers discuss your products on Reddit, G2, and social forums.",
  socialHandles:
    "Enables monitoring of direct brand mentions, executive engagement, and customer support escalation channels.",
} as const;

/**
 * Clean & normalize domain strings (strip protocol, www, trailing slashes)
 */
export function normalizeDomain(domainInput: string): string {
  if (!domainInput) return "";
  let clean = domainInput.trim().toLowerCase();
  clean = clean.replace(/^https?:\/\//, "");
  clean = clean.replace(/^www\./, "");
  clean = clean.replace(/\/.*$/, "");
  return clean;
}

export const locationSchema = z.object({
  locationName: z.string().min(1, "Location name is required (e.g. Headquarters, Downtown Branch)"),
  address: z.string().optional().default(""),
  city: z.string().min(1, "City is required"),
  stateRegion: z.string().optional().default(""),
  country: z.string().min(2, "Country code must be at least 2 characters"),
  postalCode: z.string().optional().default(""),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
});

export const socialHandlesSchema = z.object({
  twitter: z.string().optional().default(""),
  linkedin: z.string().optional().default(""),
  facebook: z.string().optional().default(""),
  instagram: z.string().optional().default(""),
  youtube: z.string().optional().default(""),
  github: z.string().optional().default(""),
});

export const defaultSocialHandles = {
  twitter: "",
  linkedin: "",
  facebook: "",
  instagram: "",
  youtube: "",
  github: "",
};

export const companyProfileSchema = z.object({
  companyName: z
    .string()
    .min(2, "Company name must be at least 2 characters")
    .max(100, "Company name must be less than 100 characters"),
  displayName: z
    .string()
    .max(100, "Display name must be less than 100 characters")
    .optional()
    .default(""),
  primaryDomain: z
    .string()
    .refine(
      (val) => {
        if (!val || val.trim() === "") return true; // Optional
        const normalized = normalizeDomain(val);
        return /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(
          normalized
        );
      },
      {
        message: "Please enter a valid domain format (e.g. acme.com)",
      }
    )
    .optional()
    .default(""),
  country: z
    .string()
    .min(2, "Country is required")
    .max(10, "Country code must be valid"),
  industry: z
    .string()
    .min(2, "Industry classification is required"),
  locations: z.array(locationSchema).default([]),
  aliases: z
    .array(z.string().min(1, "Alias cannot be empty").max(100))
    .default([]),
  socialHandles: socialHandlesSchema.default(defaultSocialHandles),
});

export const updateCompanyProfileSchema = companyProfileSchema.partial();

export type CompanyProfileInput = z.infer<typeof companyProfileSchema>;
export type UpdateCompanyProfileInput = z.infer<typeof updateCompanyProfileSchema>;
export type LocationInput = z.infer<typeof locationSchema>;
export type SocialHandlesInput = z.infer<typeof socialHandlesSchema>;

/**
 * Calculates a profile completeness score (0 to 100) based on metadata richness.
 */
export function calculateCompletenessScore(
  profile: Partial<Omit<CompanyProfileInput, "socialHandles">> & {
    socialHandles?: Partial<SocialHandlesInput>;
  }
): number {
  let score = 0;

  // 1. Company Name (Required base) - 20 pts
  if (profile.companyName && profile.companyName.trim().length >= 2) {
    score += 20;
  }

  // 2. Country & Industry (Classification) - 20 pts
  if (profile.country && profile.country.trim().length >= 2) {
    score += 10;
  }
  if (profile.industry && profile.industry.trim().length >= 2) {
    score += 10;
  }

  // 3. Primary Domain (Web identity) - 20 pts
  if (profile.primaryDomain && profile.primaryDomain.trim().length >= 3) {
    score += 20;
  }

  // 4. Physical Locations / Branches (Geo intelligence) - 15 pts
  if (profile.locations && profile.locations.length > 0) {
    score += 15;
  }

  // 5. Aliases & Known Brands (Entity matching) - 15 pts
  if (profile.aliases && profile.aliases.length > 0) {
    score += 15;
  }

  // 6. Social Handles (Social intelligence) - 10 pts
  if (profile.socialHandles) {
    const hasSocial = Object.values(profile.socialHandles).some(
      (h) => h && h.trim().length > 0
    );
    if (hasSocial) {
      score += 10;
    }
  }

  return Math.min(100, Math.max(0, score));
}
