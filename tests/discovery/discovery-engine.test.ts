import { describe, test, expect } from "vitest";
import { canonicalizeUrl, classifySourceType, evaluateCandidateConfidence } from "../../src/lib/discovery/utils";
import { generateDiscoveryQueries } from "../../src/lib/discovery/queries";
import { DiscoveryService } from "../../src/lib/discovery/service";
import { MockSearchProvider } from "../../src/lib/discovery/providers/mock";

describe("Phase 6: Company Discovery Engine", () => {
  describe("URL Canonicalization & Classification", () => {
    test("Canonicalize URLs: strip UTM and normalize host/protocol", () => {
      const dirtyUrl = "http://www.trustpilot.com/review/acme.com/?utm_source=google&utm_medium=cpc&ref=xyz";
      const cleanUrl = canonicalizeUrl(dirtyUrl);
      expect(cleanUrl).toBe("https://trustpilot.com/review/acme.com");
    });

    test("Classify source types accurately", () => {
      expect(classifySourceType("https://trustpilot.com/review/acme.com")).toBe("trustpilot");
      expect(classifySourceType("https://g2.com/products/acme/reviews")).toBe("g2");
      expect(classifySourceType("https://reddit.com/r/SaaS/comments/123/acme")).toBe("reddit");
      expect(classifySourceType("https://maps.google.com/?cid=123")).toBe("google_maps");
      expect(classifySourceType("https://some-tech-blog.com/news/acme")).toBe("generic_web");
    });
  });

  describe("Confidence Scoring & False Positive Prevention", () => {
    test("High confidence score when exact name and domain match", () => {
      const evaluation = evaluateCandidateConfidence(
        "https://trustpilot.com/review/acme.com",
        "Reviews of Acme Corp | Trustpilot",
        "Read customer reviews about acme.com",
        {
          companyName: "Acme Corp",
          domain: "acme.com",
        }
      );

      expect(evaluation.confidence).toBeGreaterThanOrEqual(0.85);
      expect(evaluation.verificationStatus).toBe("verified_auto");
    });

    test("Prevent false positive: generic name in another location", () => {
      // Scenario: Target is "Apex Dental" in "London, UK", but result is "Apex Dental" in "Sydney, Australia"
      const evaluation = evaluateCandidateConfidence(
        "https://maps.google.com/?cid=999",
        "Apex Dental Clinic Sydney",
        "Dentist in Sydney, Australia",
        {
          companyName: "Apex Dental",
          locations: [{ city: "London", country: "UK" }],
          country: "UK",
        }
      );

      // Should not have full confidence because location does not match
      expect(evaluation.confidence).toBeLessThan(0.85);
      expect(evaluation.verificationStatus).not.toBe("verified_auto");
    });
  });

  describe("Discovery Query Generation", () => {
    test("Generates comprehensive search queries based on profile", () => {
      const queries = generateDiscoveryQueries({
        companyName: "Acme Cloud",
        domain: "acmecloud.io",
        industry: "B2B SaaS & Software",
        locations: [{ city: "San Francisco", country: "US" }],
      });

      const queryTerms = queries.map((q) => q.term);

      // Verify presence of key search intents
      expect(queryTerms.some((t) => t.includes("trustpilot.com"))).toBe(true);
      expect(queryTerms.some((t) => t.includes("g2.com"))).toBe(true);
      expect(queryTerms.some((t) => t.includes("reddit.com"))).toBe(true);
      expect(queryTerms.some((t) => t.includes("maps.google.com"))).toBe(true);
    });
  });

  describe("End-to-End Discovery Pipeline", () => {
    test("Discovers, canonicalizes, and deduplicates candidate sources", async () => {
      const mockProvider = new MockSearchProvider();

      // Inject duplicate raw search hits with different UTM parameters
      mockProvider.setMockResults('"Acme Corp" official website', [
        {
          url: "https://www.acme.com/?utm_source=search",
          title: "Acme Corp Official Site",
          snippet: "Official site for Acme Corp",
          relevanceScore: 0.99,
        },
        {
          url: "https://acme.com/",
          title: "Acme Corp - Home",
          snippet: "Home page of Acme Corp",
          relevanceScore: 0.95,
        },
      ]);

      const service = new DiscoveryService(mockProvider);
      const result = await service.runDiscovery("test-profile-id", {
        companyName: "Acme Corp",
        domain: "acme.com",
      });

      expect(result.metrics.totalSearches).toBeGreaterThan(0);
      expect(result.candidates.length).toBeGreaterThan(0);

      // Ensure the two duplicate URLs for acme.com were deduplicated into exactly one canonical entry
      const websiteCandidates = result.candidates.filter((c) => c.normalizedUrl === "https://acme.com");
      expect(websiteCandidates.length).toBe(1);
    });
  });
});
