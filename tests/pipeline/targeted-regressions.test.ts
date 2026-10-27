import { afterEach, describe, expect, it } from "vitest";
import { MockAIProvider } from "../../src/lib/ai/adapters/mock-adapter";
import { resetDefaultAIProvider, setDefaultAIProvider } from "../../src/lib/ai/provider";
import { generateOptimizedQueries, OptimizedQueriesSchema } from "../../src/lib/discovery/ai-query-optimizer";
import { URLVerificationSchema, verifyURLWithAI } from "../../src/lib/discovery/ai-url-verifier";
import { AIExtractionResultSchema } from "../../src/lib/scraping/extractors/ai-fallback-extractor";
import { selectDiverseCandidates } from "../../src/lib/pipeline/pipeline-orchestrator";

afterEach(() => resetDefaultAIProvider());

describe("targeted pipeline regressions", () => {
  it("normalizes compact query arrays and falls back from malformed output", async () => {
    expect(OptimizedQueriesSchema.parse(["site:reddit.com Acme review"])).toMatchObject({ totalQueries: 1, queries: [{ query: "site:reddit.com Acme review", platform: "generic_web" }] });
    expect(OptimizedQueriesSchema.safeParse({ queries: ["not an object"] }).success).toBe(false);
    const provider = new MockAIProvider();
    provider.enqueueStructuredResponse(["site:reddit.com Acme review"]);
    setDefaultAIProvider(provider);
    await expect(generateOptimizedQueries({ companyName: "Acme" })).resolves.toHaveLength(1);
    provider.enqueueStructuredResponse({ queries: ["not an object"] });
    const fallback = await generateOptimizedQueries({ companyName: "Acme", domain: "acme.test" });
    expect(fallback.some((query) => query.platform === "reddit")).toBe(true);
    provider.enqueueStructuredResponse({ queries: ["not an object"] });
    const hotelFallback = await generateOptimizedQueries({ companyName: "Harbor Hotel", industry: "Hospitality" });
    expect(hotelFallback.some((query) => query.query.includes("booking.com"))).toBe(true);
    expect(hotelFallback.some((query) => query.query.includes("agoda.com"))).toBe(true);
  });

  it("safely rejects incomplete URL decisions", async () => {
    expect(URLVerificationSchema.safeParse({ isReviewPage: true }).success).toBe(false);
    const provider = new MockAIProvider();
    provider.enqueueStructuredResponse({ isReviewPage: true, confidence: 0.9, reasoning: "Specific discussion thread", expectedContentType: "forum_discussion", shouldScrape: true });
    setDefaultAIProvider(provider);
    await expect(verifyURLWithAI("https://reddit.com/r/test/comments/123/example", "reddit")).resolves.toMatchObject({ shouldScrape: true });
    provider.enqueueStructuredResponse({ isReviewPage: true });
    await expect(verifyURLWithAI("https://example.com/about", "generic_web")).resolves.toMatchObject({ shouldScrape: false, expectedContentType: "generic_website" });
  });

  it("treats null AI ratings and dates as unavailable", () => {
    const result = AIExtractionResultSchema.parse({ extractedFeedback: [{ authorName: "poster", content: "This forum post has no rating or publication timestamp.", rating: null, postedAt: null }], pageType: "forum_thread", confidence: 0.8 });
    expect(result.extractedFeedback[0]).toMatchObject({ rating: undefined, postedAt: undefined });
  });
  it("prioritizes distinct source types when a pipeline source limit is applied", () => {
    const selected = selectDiverseCandidates([
      { url: "https://trustpilot.com/review/a", normalizedUrl: "https://trustpilot.com/review/a", title: "A", sourceType: "trustpilot", discoveredQuery: "a", relevanceScore: 1, confidence: 1, reason: "", verificationStatus: "verified_auto" },
      { url: "https://trustpilot.com/review/b", normalizedUrl: "https://trustpilot.com/review/b", title: "B", sourceType: "trustpilot", discoveredQuery: "b", relevanceScore: 1, confidence: 1, reason: "", verificationStatus: "verified_auto" },
      { url: "https://reddit.com/r/test/comments/1/a", normalizedUrl: "https://reddit.com/r/test/comments/1/a", title: "C", sourceType: "reddit", discoveredQuery: "c", relevanceScore: 1, confidence: 1, reason: "", verificationStatus: "verified_auto" },
      { url: "https://instagram.com/p/a", normalizedUrl: "https://instagram.com/p/a", title: "D", sourceType: "instagram", discoveredQuery: "d", relevanceScore: 1, confidence: 1, reason: "", verificationStatus: "verified_auto" },
    ], 3);

    expect(selected.map((candidate) => candidate.sourceType)).toEqual(["trustpilot", "reddit", "instagram"]);
  });
});
