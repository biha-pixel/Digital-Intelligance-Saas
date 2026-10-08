import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { PipelineOrchestrator } from "../../src/lib/pipeline/pipeline-orchestrator";
import { MockSearchProvider } from "../../src/lib/discovery/providers/mock";
import { MockAIProvider } from "../../src/lib/ai/adapters/mock-adapter";
import { setDefaultAIProvider, resetDefaultAIProvider } from "../../src/lib/ai/provider";
import { DashboardService } from "../../src/lib/dashboard/dashboard-service";
import { FeedbackAnalysisResult } from "../../src/lib/analysis/schemas";
import { readFileSync } from "fs";
import path from "path";

describe("Phase 12: End-to-End MVP Intelligence Pipeline & Real-Time Dashboard", () => {
  let mockSearchProvider: MockSearchProvider;
  let mockAIProvider: MockAIProvider;
  let inMemoryDb: {
    organizations: any[];
    company_profiles: any[];
    company_domains: any[];
    company_aliases: any[];
    company_locations: any[];
    company_social_accounts: any[];
    source_discoveries: any[];
    sources: any[];
    ingestion_runs: any[];
    feedback_items: any[];
    feedback_analyses: any[];
  };
  let mockSupabase: any;

  beforeEach(() => {
    vi.restoreAllMocks();
    resetDefaultAIProvider();

    mockSearchProvider = new MockSearchProvider();
    mockAIProvider = new MockAIProvider();
    setDefaultAIProvider(mockAIProvider);

    // In-memory relational database state simulating Supabase PostgreSQL with RLS
    inMemoryDb = {
      organizations: [
        {
          id: "org-acme-100",
          name: "Acme Cloud Technologies",
          slug: "acme-cloud",
          created_at: new Date().toISOString(),
        },
      ],
      company_profiles: [
        {
          id: "prof-acme-100",
          organization_id: "org-acme-100",
          name: "Acme Cloud",
          legal_name: "Acme Cloud Technologies Inc.",
          website_url: "https://acmecloud.example.com",
          industry: "B2B SaaS / Developer Tools",
          country: "US",
          created_at: new Date().toISOString(),
        },
      ],
      company_domains: [
        {
          id: "dom-1",
          company_profile_id: "prof-acme-100",
          domain: "acmecloud.example.com",
          is_primary: true,
        },
      ],
      company_aliases: [
        {
          id: "alias-1",
          company_profile_id: "prof-acme-100",
          alias: "Acme App",
        },
      ],
      company_locations: [
        {
          id: "loc-1",
          company_profile_id: "prof-acme-100",
          city: "San Francisco",
          country: "US",
          state_region: "CA",
          address_line1: "100 Market St",
        },
      ],
      company_social_accounts: [],
      source_discoveries: [],
      sources: [],
      ingestion_runs: [],
      feedback_items: [],
      feedback_analyses: [],
    };

    // Construct mock Supabase client querying inMemoryDb with fluent query builder chaining
    mockSupabase = {
      from: vi.fn((tableName: string) => {
        const state = inMemoryDb as any;
        const rows: any[] = state[tableName] || [];
        let filteredRows = [...rows];

        const queryBuilder: any = {
          _tableName: tableName,
          select: vi.fn((fields: string) => {
            // Support relation joins for company_profiles
            if (tableName === "company_profiles") {
              filteredRows = filteredRows.map((p) => ({
                ...p,
                company_domains: inMemoryDb.company_domains.filter((d) => d.company_profile_id === p.id),
                company_aliases: inMemoryDb.company_aliases.filter((a) => a.company_profile_id === p.id),
                company_locations: inMemoryDb.company_locations.filter((l) => l.company_profile_id === p.id),
                company_social_accounts: inMemoryDb.company_social_accounts.filter((s) => s.company_profile_id === p.id),
              }));
            }
            if (tableName === "feedback_analyses") {
              filteredRows = filteredRows.map((a) => {
                const item = inMemoryDb.feedback_items.find((f) => f.id === a.feedback_item_id);
                return {
                  ...a,
                  feedback_items: item ? { source_type: item.source_type, source_url: item.source_url } : null,
                };
              });
            }
            return queryBuilder;
          }),
          eq: vi.fn((field: string, val: any) => {
            filteredRows = filteredRows.filter((r) => r[field] === val);
            return queryBuilder;
          }),
          is: vi.fn((field: string, val: any) => {
            if (val === null) {
              filteredRows = filteredRows.filter((r) => r[field] === null || r[field] === undefined);
            } else {
              filteredRows = filteredRows.filter((r) => r[field] === val);
            }
            return queryBuilder;
          }),
          in: vi.fn((field: string, values: any[]) => {
            filteredRows = filteredRows.filter((r) => values.includes(r[field]));
            return queryBuilder;
          }),
          order: vi.fn(() => queryBuilder),
          limit: vi.fn((count: number) => {
            filteredRows = filteredRows.slice(0, count);
            return queryBuilder;
          }),
          single: vi.fn(async () => {
            if (filteredRows.length === 0) {
              return { data: null, error: { message: `No row found in ${tableName}` } };
            }
            return { data: filteredRows[0], error: null };
          }),
          maybeSingle: vi.fn(async () => {
            return { data: filteredRows[0] || null, error: null };
          }),
          then: (resolve: any, reject: any) => {
            return Promise.resolve({ data: filteredRows, error: null }).then(resolve, reject);
          },
          insert: vi.fn((insertPayload: any) => {
            const itemsToInsert = Array.isArray(insertPayload) ? insertPayload : [insertPayload];
            const insertedWithIds = itemsToInsert.map((item, idx) => ({
              id: item.id || `gen_${tableName}_${Date.now()}_${idx}`,
              created_at: item.created_at || new Date().toISOString(),
              ...item,
            }));

            if (state[tableName]) {
              state[tableName].push(...insertedWithIds);
            }

            return {
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: insertedWithIds[0],
                  error: null,
                }),
                then: (resolve: any, reject: any) =>
                  Promise.resolve({ data: insertedWithIds, error: null }).then(resolve, reject),
              })),
              single: vi.fn().mockResolvedValue({
                data: insertedWithIds[0],
                error: null,
              }),
              then: (resolve: any, reject: any) =>
                Promise.resolve({ data: insertedWithIds, error: null }).then(resolve, reject),
            };
          }),
          update: vi.fn((updatePayload: any) => {
            return {
              eq: vi.fn((field: string, val: any) => {
                const matched = (state[tableName] || []).filter((r: any) => r[field] === val);
                matched.forEach((r: any) => Object.assign(r, updatePayload));
                return Promise.resolve({ data: matched, error: null });
              }),
            };
          }),
        };

        return queryBuilder;
      }),
    };
  });

  afterEach(() => {
    resetDefaultAIProvider();
  });

  it("should successfully execute all 13 steps of the MVP Intelligence Pipeline and assemble live dashboard analytics", async () => {
    // 1. Configure Mock Search Discovery
    mockSearchProvider.setMockResults([
      {
        url: "https://www.trustpilot.com/review/acmecloud.example.com",
        title: "Acme Cloud Reviews | Read Customer Service Reviews of acmecloud.example.com",
        snippet: "See what customers say about Acme Cloud. Real customer reviews and feedback.",
      },
      {
        url: "https://www.yelp.com/biz/acme-cloud-san-francisco",
        title: "Acme Cloud - San Francisco, CA - Yelp",
        snippet: "10 reviews of Acme Cloud 'Great cloud platform with responsive customer service...'",
      },
      {
        url: "https://apps.apple.com/us/app/acme-cloud-mobile/id123456789",
        title: "Acme Cloud Mobile on the App Store",
        snippet: "Download Acme Cloud Mobile and enjoy it on your iPhone, iPad, and iPod touch.",
      },
    ]);

    // 2. Configure Mock AI Responses for Analysis Engine (FeedbackAnalysisSchema format)
    const mockAnalysis1: FeedbackAnalysisResult = {
      sentiment: "very_negative",
      sentimentScore: -0.90,
      emotion: "anger",
      intent: "complaint",
      severity: "critical",
      topics: ["billing", "customer_support"],
      complaintDetected: true,
      complaintSummary: "Overcharged on renewal with zero customer support response",
      customerIntent: "Request immediate refund and threaten account cancellation",
      recommendedAction: "Escalate to priority billing team to reverse charges",
      conciseSummary: "Customer overcharged during renewal; support unresponsive.",
      painPoints: ["Unresponsive support", "Incorrect billing renewal"],
      confidence: {
        sentimentConfidence: 0.96,
        intentConfidence: 0.92,
        overallConfidence: 0.94,
      },
      isSpam: false,
      isAmbiguous: false,
    };

    const mockAnalysis2: FeedbackAnalysisResult = {
      sentiment: "positive",
      sentimentScore: 0.85,
      emotion: "joy",
      intent: "praise",
      severity: "low",
      topics: ["ui_ux", "performance"],
      complaintDetected: false,
      complaintSummary: null,
      customerIntent: "Praise modern dashboard interface",
      recommendedAction: "Share feedback with design team",
      conciseSummary: "Customer delighted with platform UI and performance.",
      painPoints: [],
      confidence: {
        sentimentConfidence: 0.98,
        intentConfidence: 0.95,
        overallConfidence: 0.96,
      },
      isSpam: false,
      isAmbiguous: false,
    };

    const mockAnalysis3: FeedbackAnalysisResult = {
      sentiment: "negative",
      sentimentScore: -0.65,
      emotion: "frustration",
      intent: "bug_report",
      severity: "high",
      topics: ["export", "pdf_generator"],
      complaintDetected: true,
      complaintSummary: "PDF report export hangs at 99%",
      customerIntent: "Report export timeout defect",
      recommendedAction: "Investigate async background worker job timeouts",
      conciseSummary: "PDF generation worker hangs when exporting large accounts.",
      painPoints: ["Export crash", "Hanging UI"],
      confidence: {
        sentimentConfidence: 0.90,
        intentConfidence: 0.88,
        overallConfidence: 0.89,
      },
      isSpam: false,
      isAmbiguous: false,
    };

    mockAIProvider.enqueueStructuredResponse(mockAnalysis1);
    mockAIProvider.enqueueStructuredResponse(mockAnalysis2);
    mockAIProvider.enqueueStructuredResponse(mockAnalysis3);

    // 3. Instantiate Pipeline Orchestrator with our in-memory DB and mock search provider
    const orchestrator = new PipelineOrchestrator({
      supabase: mockSupabase,
      searchProvider: mockSearchProvider,
    });

    // 4. Run the full End-to-End Pipeline
    const summary = await orchestrator.runFullPipeline("org-acme-100", {
      skipCrawl: true, // We'll test manual fixture injection below to verify scraping/dedup
    });

    // Step verification
    expect(summary.status).toBe("completed");
    expect(summary.organizationId).toBe("org-acme-100");
    expect(summary.stats.candidatesDiscovered).toBeGreaterThanOrEqual(2);
    expect(summary.stats.sourcesVerified).toBeGreaterThanOrEqual(1);

    // Verify records were inserted into source_discoveries and sources
    expect(inMemoryDb.source_discoveries.length).toBeGreaterThan(0);
    expect(inMemoryDb.sources.length).toBeGreaterThan(0);

    const verifiedSource = inMemoryDb.sources[0];
    expect(verifiedSource.verification_status).toBe("verified_auto");
    expect(verifiedSource.confidence_score).toBeGreaterThanOrEqual(0.70);

    // 5. Ingest Normalized Reviews into Database
    const trustpilotHtml = readFileSync(
      path.join(__dirname, "../fixtures/trustpilot.html"),
      "utf-8"
    );

    // Simulate Scrape Ingestion for the verified source
    const { FeedbackIngestionService } = await import("../../src/lib/feedback/ingestion");
    const ingestionService = new FeedbackIngestionService(mockSupabase);

    const ingestSummary = await ingestionService.ingestFromScrape({
      organizationId: "org-acme-100",
      sourceId: verifiedSource.id,
      sourceUrl: verifiedSource.url,
      sourceType: verifiedSource.source_type,
      rawHtml: trustpilotHtml,
    });

    expect(ingestSummary.metrics.totalExtracted).toBe(4);
    expect(ingestSummary.metrics.inBatchDuplicates).toBe(1); // 1 duplicate removed in-memory
    expect(ingestSummary.metrics.newCount).toBe(3); // 3 distinct feedback items stored
    expect(inMemoryDb.feedback_items.length).toBe(3);

    // 6. Test Two-Tier Deduplication (Re-crawl same content)
    const secondIngest = await ingestionService.ingestFromScrape({
      organizationId: "org-acme-100",
      sourceId: verifiedSource.id,
      sourceUrl: verifiedSource.url,
      sourceType: verifiedSource.source_type,
      rawHtml: trustpilotHtml,
    });

    expect(secondIngest.metrics.dbDuplicates).toBe(3); // All 3 recognized as DB duplicates
    expect(secondIngest.metrics.newCount).toBe(0);
    expect(inMemoryDb.feedback_items.length).toBe(3); // No new items inserted

    // 7. Execute AI Analysis on the Ingested Items
    const { FeedbackAnalysisService } = await import("../../src/lib/analysis/engine");
    const analysisService = FeedbackAnalysisService.getInstance();

    const unanalyzed = inMemoryDb.feedback_items.map((r) => ({
      id: r.id,
      organization_id: r.organization_id,
      source_id: r.source_id,
      source_type: r.source_type,
      source_url: r.source_url,
      native_feedback_id: r.native_feedback_id,
      author_identifier: r.author_hash,
      content_text: r.content_text,
      rating: r.rating,
      content_hash: r.content_hash,
    }));

    const batchSummary = await analysisService.analyzeBatch(unanalyzed as any, {
      persist: true,
      organizationId: "org-acme-100",
    });

    expect(batchSummary.total).toBe(3);
    expect(batchSummary.completed).toBe(3);
    expect(batchSummary.failed).toBe(0);

    // Update the feedback_items in inMemoryDb to mirror persistence
    batchSummary.executions.forEach((exec, idx) => {
      const res = exec.result;
      if (res && inMemoryDb.feedback_items[idx]) {
        inMemoryDb.feedback_items[idx].sentiment_label = res.sentiment;
        inMemoryDb.feedback_items[idx].sentiment_score = res.sentimentScore;

        inMemoryDb.feedback_analyses.push({
          id: `analysis-${idx}`,
          organization_id: "org-acme-100",
          feedback_item_id: inMemoryDb.feedback_items[idx].id,
          extracted_topics: res.topics,
          churn_risk_score: res.severity === "critical" ? 0.95 : 0.20,
          suggested_action: res.recommendedAction,
          raw_response: res,
          created_at: new Date().toISOString(),
        });
      }
    });

    // 8. Query Dashboard Service & Verify Real Live Data Aggregations
    const dashboardService = new DashboardService(mockSupabase);
    const dashboardData = await dashboardService.getDashboardOverview("org-acme-100");

    // Assert Dashboard Overview Content
    expect(dashboardData.companyName).toBe("Acme Cloud");
    expect(dashboardData.isConfigured).toBe(true);

    // Discovery Metrics Assertions
    expect(dashboardData.discovery.totalDiscovered).toBeGreaterThanOrEqual(2);
    expect(dashboardData.discovery.verifiedAutoCount).toBeGreaterThanOrEqual(1);

    // Source Metrics Assertions
    expect(dashboardData.sources.totalSources).toBeGreaterThanOrEqual(1);
    expect(dashboardData.sources.verifiedSources).toBeGreaterThanOrEqual(1);
    expect(dashboardData.sources.sourcesList[0].displayName).toBeDefined();

    // Feedback & Sentiment Metrics Assertions
    expect(dashboardData.feedback.totalFeedbackCount).toBe(3);
    expect(dashboardData.feedback.analyzedCount).toBe(3);
    expect(dashboardData.feedback.pendingAnalysisCount).toBe(0);
    expect(dashboardData.feedback.sentimentBreakdown.veryNegative).toBe(1);
    expect(dashboardData.feedback.sentimentBreakdown.positive).toBe(1);
    expect(dashboardData.feedback.sentimentBreakdown.negative).toBe(1);
    expect(dashboardData.feedback.negativePercentage).toBeGreaterThan(0);

    // Topics Clustering Assertions
    expect(dashboardData.topics.length).toBeGreaterThan(0);
    const topicNames = dashboardData.topics.map((t) => t.topic);
    expect(topicNames).toContain("billing");

    // Severe Feedback & Churn Detection Assertions
    expect(dashboardData.severeFeedback.length).toBeGreaterThanOrEqual(1);
    const criticalItem = dashboardData.severeFeedback.find((f) => f.severity === "critical");
    expect(criticalItem).toBeDefined();
    expect(criticalItem?.churnRiskScore).toBeGreaterThanOrEqual(0.70);
    expect(criticalItem?.suggestedAction).toContain("billing");
  });
});
