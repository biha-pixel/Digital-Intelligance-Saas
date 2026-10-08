"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireOrgAccess } from "@/lib/auth/session";
import {
  companyProfileSchema,
  calculateCompletenessScore,
  normalizeDomain,
  type CompanyProfileInput,
} from "@/lib/validations/company-profile";
import type { Json } from "@/types/database.types";

export interface SaveCompanyProfileResult {
  success: boolean;
  companyProfileId?: string;
  completenessScore?: number;
  error?: string;
  validationErrors?: Record<string, string[]>;
}

/**
 * Server Action: Saves or updates the company profile and associated normalized entities
 * in a relational multi-table structure within the active organization context.
 */
export async function saveCompanyProfile(
  rawInput: CompanyProfileInput
): Promise<SaveCompanyProfileResult> {
  try {
    // 1. Enforce Zero-Trust Organization & Authentication Boundary
    const { org } = await requireOrgAccess("member");
    const supabase = await createClient();

    // 2. Validate input schema with Zod
    const parseResult = companyProfileSchema.safeParse(rawInput);
    if (!parseResult.success) {
      const flattened = parseResult.error.flatten();
      return {
        success: false,
        error: "Validation failed. Please check the form fields.",
        validationErrors: flattened.fieldErrors,
      };
    }

    const data = parseResult.data;
    const normalizedDomain = data.primaryDomain ? normalizeDomain(data.primaryDomain) : null;
    const completenessScore = calculateCompletenessScore(data);

    // 3. Check for existing company profile for this organization
    const { data: existingProfile } = await supabase
      .from("company_profiles")
      .select("id")
      .eq("organization_id", org.id)
      .maybeSingle();

    let companyProfileId = existingProfile?.id;

    if (existingProfile) {
      // Update existing company profile
      const { error: updateError } = await supabase
        .from("company_profiles")
        .update({
          company_name: data.companyName,
          display_name: data.displayName || data.companyName,
          primary_domain: normalizedDomain,
          country: data.country,
          industry: data.industry,
          locations: data.locations as unknown as Json,
          aliases: data.aliases as unknown as Json,
          social_handles: data.socialHandles as unknown as Json,
          completeness_score: completenessScore,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingProfile.id)
        .eq("organization_id", org.id);

      if (updateError) {
        return {
          success: false,
          error: `Failed to update company profile: ${updateError.message}`,
        };
      }

      // Clear existing child relational records for clean sync
      await supabase.from("company_domains").delete().eq("company_profile_id", existingProfile.id);
      await supabase.from("company_aliases").delete().eq("company_profile_id", existingProfile.id);
      await supabase.from("company_locations").delete().eq("company_profile_id", existingProfile.id);
      await supabase.from("company_social_accounts").delete().eq("company_profile_id", existingProfile.id);
    } else {
      // Insert new company profile
      const { data: newProfile, error: insertError } = await supabase
        .from("company_profiles")
        .insert({
          organization_id: org.id,
          company_name: data.companyName,
          display_name: data.displayName || data.companyName,
          primary_domain: normalizedDomain,
          country: data.country,
          industry: data.industry,
          locations: data.locations as unknown as Json,
          aliases: data.aliases as unknown as Json,
          social_handles: data.socialHandles as unknown as Json,
          completeness_score: completenessScore,
        })
        .select("id")
        .single();

      if (insertError || !newProfile) {
        return {
          success: false,
          error: `Failed to create company profile: ${insertError?.message || "Unknown error"}`,
        };
      }

      companyProfileId = newProfile.id;
    }

    if (!companyProfileId) {
      return { success: false, error: "Failed to resolve company profile ID." };
    }

    // 4. Populate Child Tables (Relational Normalization)

    // Domains
    if (normalizedDomain) {
      await supabase.from("company_domains").insert({
        organization_id: org.id,
        company_profile_id: companyProfileId,
        domain: normalizedDomain,
        is_primary: true,
      });
    }

    // Aliases
    if (data.aliases && data.aliases.length > 0) {
      const aliasRows = data.aliases.map((alias) => ({
        organization_id: org.id,
        company_profile_id: companyProfileId!,
        alias_name: alias.trim(),
        is_primary_brand: false,
      }));
      await supabase.from("company_aliases").insert(aliasRows);
    }

    // Locations
    if (data.locations && data.locations.length > 0) {
      const locationRows = data.locations.map((loc) => ({
        organization_id: org.id,
        company_profile_id: companyProfileId!,
        location_name: loc.locationName,
        address: loc.address || null,
        city: loc.city,
        state_region: loc.stateRegion || null,
        country: loc.country,
        postal_code: loc.postalCode || null,
        latitude: loc.latitude ?? null,
        longitude: loc.longitude ?? null,
      }));
      await supabase.from("company_locations").insert(locationRows);
    }

    // Social Accounts
    if (data.socialHandles) {
      const socialRows: Array<{
        organization_id: string;
        company_profile_id: string;
        platform: string;
        handle: string;
        profile_url: string;
      }> = [];

      for (const [platform, handle] of Object.entries(data.socialHandles)) {
        if (handle && handle.trim()) {
          const cleanHandle = handle.trim().replace(/^@/, "");
          let profileUrl = "";
          if (platform === "twitter") profileUrl = `https://twitter.com/${cleanHandle}`;
          else if (platform === "linkedin") profileUrl = `https://linkedin.com/company/${cleanHandle}`;
          else if (platform === "facebook") profileUrl = `https://facebook.com/${cleanHandle}`;
          else if (platform === "instagram") profileUrl = `https://instagram.com/${cleanHandle}`;
          else if (platform === "youtube") profileUrl = `https://youtube.com/@${cleanHandle}`;
          else if (platform === "github") profileUrl = `https://github.com/${cleanHandle}`;
          else profileUrl = `https://${platform}.com/${cleanHandle}`;

          socialRows.push({
            organization_id: org.id,
            company_profile_id: companyProfileId,
            platform,
            handle: cleanHandle,
            profile_url: profileUrl,
          });
        }
      }

      if (socialRows.length > 0) {
        await supabase.from("company_social_accounts").insert(socialRows);
      }
    }

    // Revalidate dashboard and onboarding routes
    revalidatePath("/dashboard");
    revalidatePath("/onboarding");
    revalidatePath("/dashboard/settings");

    return {
      success: true,
      companyProfileId,
      completenessScore,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error occurred";
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Loads the active organization's company profile and child records.
 */
export async function getCompanyProfile() {
  try {
    const { org } = await requireOrgAccess("viewer");
    const supabase = await createClient();

    const { data: profile } = await supabase
      .from("company_profiles")
      .select("*")
      .eq("organization_id", org.id)
      .maybeSingle();

    if (!profile) {
      return null;
    }

    // Fetch related child records
    const [domainsRes, aliasesRes, locationsRes, socialRes] = await Promise.all([
      supabase.from("company_domains").select("*").eq("company_profile_id", profile.id),
      supabase.from("company_aliases").select("*").eq("company_profile_id", profile.id),
      supabase.from("company_locations").select("*").eq("company_profile_id", profile.id),
      supabase.from("company_social_accounts").select("*").eq("company_profile_id", profile.id),
    ]);

    return {
      profile,
      domains: domainsRes.data || [],
      aliases: aliasesRes.data || [],
      locations: locationsRes.data || [],
      socialAccounts: socialRes.data || [],
    };
  } catch {
    return null;
  }
}
