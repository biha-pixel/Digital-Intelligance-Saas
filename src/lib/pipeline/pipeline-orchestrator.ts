import { SupabaseClient } from "@supabase/supabase-js";
import { Database, SourceType } from "@/types/database.types";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DiscoveryService } from "@/lib/discovery/service";
import { SearchProvider } from "@/lib/discovery/types";
import { SourceVerificationEngine } from "@/lib/sources/verification-engine";
import { RegistryService } from "@/lib/sources/registry-service";
import { VerificationContext, VerificationResult } from "@/lib/sources/types";
import { runScrapingPipeline } from "@/lib/scraping/pipeline";
import { ScrapingProvider } from "@/lib/scraping/types";
import { FeedbackAnalysisService } from "@/lib/analysis/engine";
import { NormalizedFeedbackItem } from "@/types/feedback.types";
import {
  PipelineRunOptions,
  PipelineRunSummary,
  PipelineStepOutcome,
} from "./types";

export interface PipelineDependencies {
  supabase?: SupabaseClient<Database>;
  searchProvider?: SearchProvider;
  verificationEngine?: SourceVerificationEngine;
  registryService?: RegistryService;
  analysisService?: FeedbackAnalysisService;
  scrapingProvider?: ScrapingProvider;
}

/**
 * PipelineOrchestrator
 *
 * Coordinates the full 13-step MVP Intelligence Pipeline:
 * 1. User Auth & Org Validation
 * 2. Company Profile Retrieval
 * 3. Candidate Source Discovery
 * 4. Evidence-Based Verification
 * 5. Approved Source Registry
 * 6. Resilient Crawl & Scraping
 * 7. Canonical Extraction & Cleaning
 * 8. Two-Tier Deduplication
 * 9. Feedback Item Storage
 * 10. OmniRoute AI Structured Analysis
 * 11. Analytical Metadata Persistence
 */
export class PipelineOrchestrator {
  private supabase: SupabaseClient<Database> | null;
  private searchProvider?: SearchProvider;
  private verificationEngine: SourceVerificationEngine;
  private registryService?: RegistryService;
  private analysisService?: FeedbackAnalysisService;
  private scrapingProvider?: ScrapingProvider;

  constructor(deps: PipelineDependencies = {}) {
    this.supabase = deps.supabase || null;
    this.searchProvider = deps.searchProvider;
    this.verificationEngine =
      deps.verificationEngine || new SourceVerificationEngine();
    this.registryService = deps.registryService;
    this.analysisService = deps.analysisService;
    this.scrapingProvider = deps.scrapingProvider;
  }

  private async getClient(): Promise<SupabaseClient<Database>> {
    if (this.supabase) return this.supabase;
    try {
      return await createClient();
    } catch {
      return createAdminClient();
    }
  }

  /**
   * Executes the full MVP pipeline end-to-end.
   */
  async runFullPipeline(
    orgId: string,
    options: PipelineRunOptions = {}
  ): Promise<PipelineRunSummary> {
    const startedAt = new Date().toISOString();
    const runId = `pipe_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const steps: PipelineStepOutcome[] = [];

    const summary: PipelineRunSummary = {
      runId,
      organizationId: orgId,
      companyProfileId: options.companyProfileId || "",
      status: "processing",
      startedAt,
      steps,
      stats: {
        candidatesDiscovered: 0,
        sourcesVerified: 0,
        sourcesIngested: 0,
        feedbackItemsExtracted: 0,
        feedbackItemsAnalyzed: 0,
        totalTokens: 0,
        totalCostUsd: 0,
        durationMs: 0,
      },
      details: {
        candidates: [],
        verifications: [],
        ingestions: [],
        analyses: [],
      },
    };

    const recordStep = (
      name: string,
      status: PipelineStepOutcome["status"],
      started: string,
      error?: string,
      metadata?: Record<string, any>
    ) => {
      steps.push({
        step: name,
        status,
        startedAt: started,
        completedAt: new Date().toISOString(),
        error,
        metadata,
      });
    };

    const supabase = await this.getClient();

    try {
      // =========================================================================
      // Step 1 & 2: Organization & Company Profile Resolution
      // =========================================================================
      const step1Start = new Date().toISOString();
      let companyProfileId = options.companyProfileId;
      let companyProfile: any = null;

      if (!companyProfileId) {
        const { data: profile, error: profileErr } = await supabase
          .from("company_profiles")
          .select("*, company_domains(*), company_aliases(*), company_locations(*), company_social_accounts(*)")
          .eq("organization_id", orgId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (profileErr || !profile) {
          throw new Error(
            `Company profile not found for organization ${orgId}: ${profileErr?.message || "No profile"}`
          );
        }
        companyProfile = profile;
        companyProfileId = profile.id;
      } else {
        const { data: profile, error: profileErr } = await supabase
          .from("company_profiles")
          .select("*, company_domains(*), company_aliases(*), company_locations(*), company_social_accounts(*)")
          .eq("id", companyProfileId)
          .eq("organization_id", orgId)
          .single();

        if (profileErr || !profile) {
          throw new Error(
            `Company profile ${companyProfileId} not found: ${profileErr?.message || "Invalid ID"}`
          );
        }
        companyProfile = profile;
      }

      const companyName = companyProfile.display_name || companyProfile.company_name || companyProfile.name;

      summary.companyProfileId = companyProfileId;
      recordStep("1_2_org_and_profile_resolution", "completed", step1Start, undefined, {
        companyName,
        companyProfileId,
      });

      // Assemble Context for Discovery & Verification
      const primaryDomain =
        companyProfile.company_domains?.find((d: any) => d.is_primary)?.domain ||
        companyProfile.company_domains?.[0]?.domain ||
        companyProfile.primary_domain ||
        companyProfile.website_url;

      const aliases = Array.isArray(companyProfile.aliases)
        ? companyProfile.aliases
        : companyProfile.company_aliases?.map((a: any) => a.alias) || [];

      const rawLocations = companyProfile.locations || companyProfile.company_locations || [];
      const locations = Array.isArray(rawLocations)
        ? rawLocations.map((l: any) => ({
            city: l.city,
            country: l.country,
            stateRegion: l.stateRegion || l.state_region,
            address: l.address || l.address_line1,
          }))
        : [];

      const vContext: VerificationContext = {
        companyName,
        displayName: companyName,
        primaryDomain,
        industry: companyProfile.industry,
        country: companyProfile.country,
        aliases,
        locations,
      };

      // =========================================================================
      // Step 3 & 4: Candidate Discovery & Evaluation
      // =========================================================================
      const step3Start = new Date().toISOString();
      const discoveryService = new DiscoveryService(this.searchProvider, supabase);
      const discoveryResult = await discoveryService.runDiscovery(
        companyProfileId,
        {
          companyName: companyName,
          domain: primaryDomain,
          industry: companyProfile.industry,
          country: companyProfile.country,
          aliases,
          locations: locations.map((l: any) => ({ city: l.city, country: l.country })),
        },
        { persist: true, orgId }
      );

      summary.stats.candidatesDiscovered = discoveryResult.candidates.length;
      summary.details.candidates = discoveryResult.candidates;
      recordStep("3_4_candidate_discovery", "completed", step3Start, undefined, {
        discoveredCount: discoveryResult.candidates.length,
      });

      // =========================================================================
      // Step 5: Multi-Factor Verification & Source Registration
      // =========================================================================
      const step5Start = new Date().toISOString();
      const registryService = this.registryService || new RegistryService(supabase);
      const verifiedSourcesToIngest: Array<{ id: string; url: string; sourceType: SourceType }> = [];
      const verifications: VerificationResult[] = [];

      // Limit candidates if requested
      const candidateList = options.sourceLimit
        ? discoveryResult.candidates.slice(0, options.sourceLimit)
        : discoveryResult.candidates;

      for (const candidate of candidateList) {
        const verification = await this.verificationEngine.verifyCandidate(
          candidate.url,
          vContext,
          {
            title: candidate.title,
            snippet: candidate.discoveredQuery,
          }
        );
        verifications.push(verification);

        // Promote candidates with reliable verification status
        if (
          verification.verificationStatus === "verified_auto" ||
          verification.verificationStatus === "verified_manual" ||
          verification.confidence >= 0.70
        ) {
          try {
            const regResult = await registryService.registerSource(
              orgId,
              companyProfileId,
              verification
            );
            verifiedSourcesToIngest.push({
              id: regResult.id,
              url: verification.canonicalUrl,
              sourceType: verification.sourceType,
            });
          } catch (regErr: any) {
            console.warn(`Source registration notice for ${candidate.url}:`, regErr.message);
          }
        }
      }

      summary.stats.sourcesVerified = verifiedSourcesToIngest.length;
      summary.details.verifications = verifications;
      recordStep("5_verification_and_registry", "completed", step5Start, undefined, {
        verifiedCount: verifiedSourcesToIngest.length,
      });

      // =========================================================================
      // Step 6-9: Scraping, Canonical Extraction, Deduplication, & Persistence
      // =========================================================================
      const step6Start = new Date().toISOString();
      const ingestedRunIds: string[] = [];

      if (options.skipCrawl || verifiedSourcesToIngest.length === 0) {
        recordStep(
          "6_9_scraping_and_ingestion",
          options.skipCrawl ? "skipped" : "completed",
          step6Start,
          undefined,
          { message: "Crawl skipped or no verified sources found" }
        );
      } else {
        for (const source of verifiedSourcesToIngest) {
          try {
            const ingestSummary = await runScrapingPipeline(
              orgId,
              source.id,
              source.url,
              source.sourceType,
              undefined,
              {
                supabase,
                scrapingProvider: this.scrapingProvider,
                skipRobotsCheck: true,
                skipSsrfCheck: true,
              }
            );
            summary.details.ingestions?.push(ingestSummary);
            ingestedRunIds.push(ingestSummary.ingestionRunId);
            summary.stats.sourcesIngested++;
            summary.stats.feedbackItemsExtracted += ingestSummary.metrics.newCount;
          } catch (crawlErr: any) {
            console.warn(`Scraping pipeline warning for ${source.url}:`, crawlErr.message);
          }
        }

        recordStep("6_9_scraping_and_ingestion", "completed", step6Start, undefined, {
          sourcesIngested: summary.stats.sourcesIngested,
          itemsExtracted: summary.stats.feedbackItemsExtracted,
        });
      }

      // =========================================================================
      // Step 10-13: OmniRoute AI Structured Analysis & Persistence
      // =========================================================================
      const step10Start = new Date().toISOString();
      const analysisService = this.analysisService || FeedbackAnalysisService.getInstance(supabase);

      if (options.skipAnalysis) {
        recordStep("10_13_ai_analysis", "skipped", step10Start);
      } else {
        // Query newly ingested unanalyzed items or any unanalyzed items for the organization
        let rawItems: any[] = [];
        if (ingestedRunIds.length > 0) {
          const { data: newlyIngested } = await supabase
            .from("feedback_items")
            .select("*")
            .in("ingestion_run_id", ingestedRunIds)
            .is("sentiment_label", null);
          if (newlyIngested && newlyIngested.length > 0) {
            rawItems = newlyIngested;
          }
        }

        // Fallback: If no newly ingested items (e.g. items were deduplicated in a prior run), query unanalyzed items for the org
        if (rawItems.length === 0) {
          const { data: unanalyzedItems, error: itemsErr } = await supabase
            .from("feedback_items")
            .select("*")
            .eq("organization_id", orgId)
            .is("sentiment_label", null)
            .order("created_at", { ascending: false })
            .limit(20);

          if (itemsErr) {
            throw new Error(`Failed to query unanalyzed items: ${itemsErr.message}`);
          }
          rawItems = unanalyzedItems || [];
        }

        if (rawItems && rawItems.length > 0) {
          const normalizedItems: NormalizedFeedbackItem[] = rawItems.map((r: any) => ({
            id: r.id,
            organization_id: r.organization_id,
            source_id: r.source_id,
            source_type: r.source_type,
            external_id: r.external_id || r.native_feedback_id,
            author_identifier: r.author_identifier || r.author_hash || "anon",
            author_display_name: r.author_display_name || undefined,
            content_text: r.content_text,
            rating: r.rating ? Number(r.rating) : undefined,
            posted_at: r.posted_at || r.published_at || undefined,
            language_code: r.language_code || r.language || "en",
            word_count: r.word_count || (r.content_text ? r.content_text.split(/\s+/).length : 0),
            content_hash: r.content_hash || "",
            raw_payload: (r.raw_payload || r.metadata) as Record<string, unknown> | undefined,
          }));

          const batchSummary = await analysisService.analyzeBatch(normalizedItems, {
            model: options.model,
            timeoutMs: options.timeoutMs,
            organizationId: orgId,
            companyContext: {
              name: companyName,
              industry: companyProfile.industry,
              keyFeatures: companyProfile.key_features || [],
            },
          });

          summary.stats.feedbackItemsAnalyzed = batchSummary.completed;
          summary.stats.totalTokens = batchSummary.totalTokens;
          summary.stats.totalCostUsd = batchSummary.totalCostUsd;
          summary.details.analyses = batchSummary.executions;
        }

        recordStep("10_13_ai_analysis", "completed", step10Start, undefined, {
          analyzedCount: summary.stats.feedbackItemsAnalyzed,
          tokens: summary.stats.totalTokens,
          costUsd: summary.stats.totalCostUsd,
        });
      }

      summary.status = "completed";
    } catch (err: any) {
      summary.status = "failed";
      summary.error = err.message || "Unknown error occurred in pipeline orchestrator";
      recordStep("pipeline_error", "failed", startedAt, summary.error);
    } finally {
      summary.finishedAt = new Date().toISOString();
      summary.stats.durationMs = Date.now() - new Date(startedAt).getTime();
    }

    return summary;
  }
}
