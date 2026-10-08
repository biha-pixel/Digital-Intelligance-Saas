import { SearchProvider, CandidateSource, DiscoveryRunResult } from "./types";
import { generateDiscoveryQueries } from "./queries";
import { canonicalizeUrl, classifySourceType, evaluateCandidateConfidence, ProfileMatchingContext } from "./utils";
import { MockSearchProvider } from "./providers/mock";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

export class DiscoveryService {
  private searchProvider: SearchProvider;
  private supabaseClient?: SupabaseClient;

  constructor(searchProvider?: SearchProvider, supabaseClient?: SupabaseClient) {
    this.searchProvider = searchProvider || new MockSearchProvider();
    this.supabaseClient = supabaseClient;
  }

  private async getClient() {
    if (this.supabaseClient) return this.supabaseClient;
    try {
      return await createClient();
    } catch {
      return createAdminClient();
    }
  }

  /**
   * Runs discovery for a specific company profile
   */
  async runDiscovery(
    companyProfileId: string,
    context: ProfileMatchingContext,
    options?: { persist?: boolean; orgId?: string }
  ): Promise<DiscoveryRunResult> {
    const queries = generateDiscoveryQueries(context);
    const candidatesMap = new Map<string, CandidateSource>();
    let totalCandidates = 0;

    // Execute queries
    for (const query of queries) {
      try {
        const results = await this.searchProvider.search(query);
        totalCandidates += results.length;

        for (const res of results) {
          const canonicalUrl = canonicalizeUrl(res.url);

          // Deduplication based on canonical URL
          if (candidatesMap.has(canonicalUrl)) {
            continue;
          }

          const sourceType = classifySourceType(canonicalUrl);
          const evaluation = evaluateCandidateConfidence(
            canonicalUrl,
            res.title,
            res.snippet,
            context
          );

          candidatesMap.set(canonicalUrl, {
            url: res.url,
            normalizedUrl: canonicalUrl,
            title: res.title,
            sourceType,
            discoveredQuery: query.term,
            relevanceScore: res.relevanceScore || 0.5,
            confidence: evaluation.confidence,
            reason: evaluation.reason,
            verificationStatus: evaluation.verificationStatus,
          });
        }
      } catch (err) {
        console.error(`Error executing search query "${query.term}":`, err);
      }
    }

    const candidates = Array.from(candidatesMap.values());

    // Optionally persist into Supabase source_discoveries table
    if (options?.persist && options?.orgId) {
      await this.persistCandidates(options.orgId, companyProfileId, candidates);
    }

    return {
      companyProfileId,
      candidates,
      metrics: {
        totalSearches: queries.length,
        totalCandidates,
        deduplicatedCount: candidates.length,
      },
    };
  }

  private async persistCandidates(
    orgId: string,
    companyProfileId: string,
    candidates: CandidateSource[]
  ) {
    try {
      const supabase = await this.getClient();

      const payload = candidates.map((c) => ({
        organization_id: orgId,
        company_profile_id: companyProfileId,
        discovered_url: c.normalizedUrl,
        source_type: c.sourceType,
        confidence_score: c.confidence,
        discovery_method: `search_engine:${this.searchProvider.name}`,
        status: c.verificationStatus === "verified_auto" ? "approved" : "pending",
        metadata: {
          title: c.title,
          original_url: c.url,
          query: c.discoveredQuery,
          reason: c.reason,
          relevance: c.relevanceScore,
        },
      }));

      // Insert or ignore duplicates
      if (payload.length > 0) {
        await supabase.from("source_discoveries").insert(payload);
      }
    } catch (err) {
      console.error("Failed to persist source discoveries:", err);
    }
  }
}
