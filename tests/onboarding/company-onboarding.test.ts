import { expect, test, describe } from "vitest";
import * as validation from "../../src/lib/validations/company-profile";

describe("Company Onboarding Validation & Logic", () => {
  test("Validate required fields presence", () => {
    const incompleteData = {
      country: "US",
    };
    const result = validation.companyProfileSchema.safeParse(incompleteData);
    expect(result.success).toBe(false);
  });

  test("Validate successful schema parse with full data", () => {
    const fullData = {
      companyName: "Acme Corp",
      country: "US",
      industry: "B2B SaaS & Software",
      primaryDomain: "acmecorp.com",
      locations: [
        {
          locationName: "HQ",
          city: "San Francisco",
          country: "US",
          address: "123 Market St",
          stateRegion: "CA",
          postalCode: "94105",
        },
      ],
      aliases: ["Acme Inc", "Acme Global"],
      socialHandles: {
        twitter: "acmecorp",
      },
    };
    const result = validation.companyProfileSchema.safeParse(fullData);
    expect(result.success).toBe(true);
  });

  test("Domain normalization", () => {
    expect(validation.normalizeDomain("https://www.acme.com/")).toBe("acme.com");
    expect(validation.normalizeDomain("acme.com")).toBe("acme.com");
    expect(validation.normalizeDomain("https://sub.acme.com/path?query=1")).toBe("sub.acme.com");
  });

  test("Completeness score calculation", () => {
    const partial = {
      companyName: "Acme",
      country: "US",
      industry: "Tech",
    };
    // Should be 20 (name) + 10 (country) + 10 (industry) = 40
    expect(validation.calculateCompletenessScore(partial)).toBe(40);

    const full = {
      companyName: "Acme",
      country: "US",
      industry: "Tech",
      primaryDomain: "acme.com",
      locations: [
        {
          locationName: "HQ",
          city: "SF",
          country: "US",
          address: "123 Main",
          stateRegion: "CA",
          postalCode: "94105",
        },
      ],
      aliases: ["Acme"],
      socialHandles: { twitter: "acme" },
    };
    // Should be 20 + 10 + 10 + 20 + 15 + 15 + 10 = 100
    expect(validation.calculateCompletenessScore(full)).toBe(100);
  });
});
