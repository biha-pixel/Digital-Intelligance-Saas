"use server";

import { requireOrgAccess } from "@/lib/auth/session";
import { RegistryService } from "@/lib/sources/registry-service";
import { SourceVerificationEngine } from "@/lib/sources/verification-engine";
import { VerificationContext, CandidateMetadataInput, RegisteredSource } from "@/lib/sources/types";
import { VerificationStatus } from "@/types/database.types";
import { revalidatePath } from "next/cache";

const registryService = new RegistryService();
const engine = new SourceVerificationEngine();

function mapDbSourceToRegisteredSource(dbSource: any): RegisteredSource {
  return {
    id: dbSource.id,
    organizationId: dbSource.organization_id,
    companyProfileId: dbSource.company_profile_id,
    canonicalUrl: dbSource.url,
    displayName: dbSource.display_name || dbSource.url,
    sourceType: dbSource.source_type,
    sourceSubtype: (dbSource.metadata as any)?.sourceSubtype || "unclassified",
    ownership: dbSource.ownership,
    verificationStatus: dbSource.verification_status,
    confidence: dbSource.confidence_score ?? 0,
    isActive: dbSource.is_active ?? true,
    evidence: dbSource.metadata || { signals: [] },
    lastVerifiedAt: dbSource.updated_at || dbSource.created_at,
    createdAt: dbSource.created_at,
    updatedAt: dbSource.updated_at,
  };
}

/**
 * Server Action: Verifies and registers a new source candidate.
 */
export async function registerCandidateSource(
  companyProfileId: string,
  inputUrl: string,
  context: VerificationContext,
  metadata?: CandidateMetadataInput
) {
  try {
    // 1. Enforce Auth
    const { org } = await requireOrgAccess("analyst");

    // 2. Perform Verification
    const verification = await engine.verifyCandidate(inputUrl, context, metadata);

    // 3. Persist to Registry
    const result = await registryService.registerSource(org.id, companyProfileId, verification);

    revalidatePath("/dashboard/sources");

    return {
      success: true,
      data: {
        ...result,
        verification,
      },
    };
  } catch (error) {
    console.error("Failed to register candidate source:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Server Action: Retrieves all registered sources for a company profile.
 */
export async function getRegisteredSources(companyProfileId: string) {
  try {
    const { org } = await requireOrgAccess("viewer");
    const sources = await registryService.getSources(org.id, companyProfileId);

    const formattedSources: RegisteredSource[] = sources.map(mapDbSourceToRegisteredSource);

    return {
      success: true,
      data: formattedSources,
    };
  } catch (error) {
    console.error("Failed to fetch registered sources:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Server Action: Retrieves detailed evidence and audit history for a source.
 */
export async function getSourceDetails(sourceId: string) {
  try {
    const { org } = await requireOrgAccess("viewer");
    const source = await registryService.getSourceById(org.id, sourceId);

    if (!source) {
      return {
        success: false,
        error: "Source not found",
      };
    }

    return {
      success: true,
      data: source,
    };
  } catch (error) {
    console.error("Failed to fetch source details:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Server Action: Updates the verification status (manual approval / rejection).
 */
export async function updateSourceVerificationStatus(
  sourceId: string,
  status: VerificationStatus,
  notes?: string
) {
  try {
    const { org, user } = await requireOrgAccess("analyst");

    await registryService.updateVerificationStatus(
      org.id,
      sourceId,
      status,
      notes,
      user.id
    );

    revalidatePath("/dashboard/sources");

    return {
      success: true,
    };
  } catch (error) {
    console.error("Failed to update source verification status:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Server Action: Deletes a registered source from the registry.
 */
export async function deleteRegisteredSource(sourceId: string) {
  try {
    const { org } = await requireOrgAccess("admin");

    await registryService.deleteSource(org.id, sourceId);

    revalidatePath("/dashboard/sources");

    return {
      success: true,
    };
  } catch (error) {
    console.error("Failed to delete source:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Server Action: Re-evaluates a source using the multi-factor verification engine.
 */
export async function reverifyRegisteredSource(
  sourceId: string,
  context: VerificationContext,
  metadata?: CandidateMetadataInput
) {
  try {
    const { org } = await requireOrgAccess("analyst");
    const existing = await registryService.getSourceById(org.id, sourceId);

    if (!existing) {
      return {
        success: false,
        error: "Source not found",
      };
    }

    const verification = await engine.verifyCandidate(existing.url, context, metadata);

    // Update with new verification score & status
    await registryService.updateVerificationStatus(
      org.id,
      sourceId,
      verification.verificationStatus,
      `Re-verified: ${verification.summaryReason}`
    );

    revalidatePath("/dashboard/sources");

    return {
      success: true,
      data: verification,
    };
  } catch (error) {
    console.error("Failed to reverify source:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
