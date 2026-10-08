import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import { VerificationResult } from "./types";

/**
 * Service for managing the Source Registry and verification records in Supabase.
 */
export class RegistryService {
  constructor(private supabaseClient?: SupabaseClient) {}

  private async getClient() {
    if (this.supabaseClient) return this.supabaseClient;
    try {
      return await createClient();
    } catch {
      return createAdminClient();
    }
  }

  /**
   * Registers a verified source in the registry.
   * Handles canonicalization, deduplication checks, and persistence.
   */
  async registerSource(
    orgId: string,
    companyProfileId: string,
    verification: VerificationResult
  ) {
    const supabase = await this.getClient();

    // 1. Check for existing source (deduplication)
    const { data: existing } = await supabase
      .from("sources")
      .select("id")
      .eq("organization_id", orgId)
      .eq("url", verification.canonicalUrl)
      .maybeSingle();

    if (existing) {
      // Logic for updating existing source or refusing
      return { id: existing.id, status: "exists" };
    }

    // 2. Insert into `sources`
    const { data: source, error: sourceError } = await supabase
      .from("sources")
      .insert({
        organization_id: orgId,
        company_profile_id: companyProfileId,
        url: verification.evidence.canonicalUrl,
        source_type: verification.sourceType,
        ownership: verification.ownership,
        verification_status: verification.verificationStatus,
        is_active: true,
        display_name: `${verification.sourceType} - ${verification.evidence.canonicalUrl}`,
        metadata: verification.evidence as any, // Cast for JSONB
        confidence_score: verification.confidence,
      })
      .select("id")
      .single();

    if (sourceError) {
      throw new Error(`Failed to register source: ${sourceError.message}`);
    }

    // 3. Insert into `source_verifications` (audit logic)
    const { error: auditError } = await supabase
      .from("source_verifications")
      .insert({
        organization_id: orgId,
        source_id: source.id,
        status: verification.verificationStatus,
        verification_method: verification.evidence.evaluationMethod,
        notes: verification.summaryReason,
        verified_at: new Date().toISOString(),
      });

    if (auditError) {
      throw new Error(`Failed to create verification audit record: ${auditError.message}`);
    }

    return { id: source.id, status: "created" };
  }

  /**
   * Retrieves sources for a company profile with filtering.
   */
  async getSources(orgId: string, companyProfileId: string) {
    const supabase = await this.getClient();

    const { data, error } = await supabase
      .from("sources")
      .select("*")
      .eq("organization_id", orgId)
      .eq("company_profile_id", companyProfileId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to get sources: ${error.message}`);
    }

    return data;
  }

  /**
   * Gets a specific source by ID.
   */
  async getSourceById(orgId: string, sourceId: string) {
    const supabase = await this.getClient();

    const { data, error } = await supabase
      .from("sources")
      .select("*, source_verifications(*)")
      .eq("id", sourceId)
      .eq("organization_id", orgId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to get source: ${error.message}`);
    }

    return data;
  }

  /**
   * Deletes a source from the registry.
   */
  async deleteSource(orgId: string, sourceId: string) {
    const supabase = await this.getClient();

    const { error } = await supabase
      .from("sources")
      .delete()
      .eq("id", sourceId)
      .eq("organization_id", orgId);

    if (error) {
      throw new Error(`Failed to delete source: ${error.message}`);
    }

    return { success: true };
  }

  /**
   * Updates verification status for a source.
   */
  async updateVerificationStatus(
    orgId: string,
    sourceId: string,
    status: VerificationResult["verificationStatus"],
    notes?: string,
    verifiedByUserId?: string
  ) {
    const supabase = await this.getClient();

    const { error: updateError } = await supabase
      .from("sources")
      .update({
        verification_status: status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sourceId)
      .eq("organization_id", orgId);

    if (updateError) {
      throw new Error(`Failed to update source status: ${updateError.message}`);
    }

    // Insert an audit log entry into source_verifications
    await supabase.from("source_verifications").insert({
      organization_id: orgId,
      source_id: sourceId,
      status,
      verification_method: "manual_analyst",
      notes: notes || "Status updated manually",
      verified_by_user_id: verifiedByUserId || null,
      verified_at: new Date().toISOString(),
    });

    return { success: true };
  }
}
