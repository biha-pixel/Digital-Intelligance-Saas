import { describe, test, expect } from "vitest";
import { SourceVerificationEngine } from "../../src/lib/sources/verification-engine";
import { VerificationContext, CandidateMetadataInput } from "../../src/lib/sources/types";

describe("Phase 7: Source Verification & Registry Engine", () => {
  const engine = new SourceVerificationEngine();

  const context: VerificationContext = {
    companyName: "Acme Corp",
    primaryDomain: "acme.com",
    locations: [{ city: "London", country: "UK" }],
    socialHandles: {
      twitter: "@acmecorp",
    },
  };

  test("High confidence: exact domain, name, and location match", async () => {
    const metadata: CandidateMetadataInput = {
      title: "Acme Corp | London - Official Site",
      snippet: "Welcome to Acme Corp London head office.",
    };

    const result = await engine.verifyCandidate("https://acme.com", context, metadata);

    expect(result.verificationStatus).toBe("verified_auto");
    expect(result.confidence).toBeGreaterThanOrEqual(0.85);
    expect(result.ownership).toBe("owned");
  });

  test("Prevent false positive: same company name, but wrong location", async () => {
    // Scenario: Target is "Acme Corp" in "London, UK", candidate is "Acme Corp" in "Sydney, Australia"
    const metadata: CandidateMetadataInput = {
      title: "Acme Corp Sydney",
      snippet: "Dentist in Sydney, Australia",
      detectedLocation: "Sydney, Australia"
    };

    const result = await engine.verifyCandidate("https://maps.google.com/?cid=999", context, metadata);

    // Confidence should drop significantly due to location mismatch
    expect(result.confidence).toBeLessThan(0.85);
    expect(result.verificationStatus).not.toBe("verified_auto");
  });

  test("Third-party review categorization: Trustpilot not marked owned", async () => {
    const metadata: CandidateMetadataInput = {
      title: "Acme Corp Reviews | Trustpilot",
    };

    const result = await engine.verifyCandidate("https://trustpilot.com/review/acme.com", context, metadata);

    expect(result.ownership).toBe("third_party");
    expect(result.sourceSubtype).toBe("public_reviews");
  });

  test("Social handle matching", async () => {
    const metadata: CandidateMetadataInput = {
      title: "Acme Corp (@acmecorp) on X",
    };

    const result = await engine.verifyCandidate("https://twitter.com/acmecorp", context, metadata);

    expect(result.ownership).toBe("official");
    expect(result.sourceSubtype).toBe("social_profile");
    expect(result.evidence.socialMatch?.matched).toBe(true);
  });
});
