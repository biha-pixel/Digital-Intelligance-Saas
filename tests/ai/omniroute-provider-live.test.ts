import { describe, it, expect, beforeEach } from "vitest";
import { OmniRouteAdapter } from "../../src/lib/ai/adapters/omniroute-adapter";
import { FeedbackAnalysisSchema } from "../../src/lib/analysis/schemas";
import { AIAuthenticationError } from "../../src/lib/ai/errors";

/**
 * Live OmniRoute Integration Test Suite
 *
 * This test suite makes REAL API calls to the OmniRoute AI Gateway.
 * It is opt-in via the CXPULSE_LIVE_INTEGRATION_TESTS environment variable
 * and requires valid OMNIROUTE_API_KEY credentials.
 *
 * To run this test:
 *   CXPULSE_LIVE_INTEGRATION_TESTS=1 npm test -- tests/ai/omniroute-provider-live.test.ts
 *
 * Safety measures:
 * - Skips all tests if CXPULSE_LIVE_INTEGRATION_TESTS is not set to "1"
 * - Uses small, synthetic test data to minimize API costs
 * - Makes only 2-3 real API calls per test run
 * - Never logs credentials or Authorization headers
 * - Validates all responses against strict Zod schemas
 * - Captures token usage and cost metrics (if available)
 * - Handles errors gracefully without exposing sensitive details
 */

// Only run these tests if explicitly opt-in via environment variable
const shouldRunLiveTests = process.env.CXPULSE_LIVE_INTEGRATION_TESTS === "1";

describe.skipIf(!shouldRunLiveTests)(
  "OmniRoute Live Integration Tests (opt-in via CXPULSE_LIVE_INTEGRATION_TESTS=1)",
  { timeout: 60000 },
  () => {
    let adapter: OmniRouteAdapter;
    const apiKey = process.env.OMNIROUTE_API_KEY;
    const baseUrl = process.env.OMNIROUTE_BASE_URL;

    beforeEach(() => {
      // Ensure we have required configuration before each test
      if (!apiKey) {
        throw new Error(
          "OMNIROUTE_API_KEY environment variable is required for live integration tests. " +
            "Export it before running: export OMNIROUTE_API_KEY='your-key-here'"
        );
      }

      // Reinitialize adapter for each test to ensure clean state
      adapter = new OmniRouteAdapter({ apiKey, baseUrl });
    });

    describe("Structured Feedback Analysis (FeedbackAnalysisSchema)", () => {
      it("should successfully analyze customer feedback and return valid FeedbackAnalysisSchema output", async () => {
        const testFeedback = `
          Our billing system charged us twice for last month's subscription.
          I've contacted support three times but received no response.
          This is unacceptable—we need an immediate refund and explanation.
        `.trim();

        const response = await adapter.generateStructured({
          messages: [
            {
              role: "user",
              content: `Analyze this customer feedback:\n\n${testFeedback}`,
            },
          ],
          schema: FeedbackAnalysisSchema,
          schemaName: "FeedbackAnalysisSchema",
          model: "gemini-3.1-pro", // Explicitly use Gemini model
          timeoutMs: 30000,
        });

        // Verify response structure
        expect(response).toBeDefined();
        expect(response.data).toBeDefined();
        expect(response.content).toBeDefined();
        expect(response.model).toBeDefined();
        expect(response.provider).toBeDefined();
        expect(response.usage).toBeDefined();

        // Validate schema conformance: FeedbackAnalysisSchema requirements
        const data = response.data;

        // Core sentiment fields
        expect(["very_positive", "positive", "neutral", "negative", "very_negative"]).toContain(
          data.sentiment
        );
        expect(data.sentimentScore).toBeGreaterThanOrEqual(-1);
        expect(data.sentimentScore).toBeLessThanOrEqual(1);

        // Emotion field
        expect([
          "joy",
          "gratitude",
          "delight",
          "frustration",
          "anger",
          "confusion",
          "disappointment",
          "neutral",
        ]).toContain(data.emotion);

        // Intent field
        expect([
          "complaint",
          "praise",
          "feature_request",
          "bug_report",
          "question",
          "refund_request",
          "churn_threat",
          "general_feedback",
        ]).toContain(data.intent);

        // Severity field
        expect(["low", "medium", "high", "critical"]).toContain(data.severity);

        // Topics array
        expect(Array.isArray(data.topics)).toBe(true);
        expect(data.topics.length).toBeGreaterThan(0);
        expect(data.topics.length).toBeLessThanOrEqual(8);
        data.topics.forEach((topic) => {
          expect(typeof topic).toBe("string");
          expect(topic.length).toBeGreaterThan(0);
        });

        // Complaint detection
        expect(typeof data.complaintDetected).toBe("boolean");
        if (data.complaintDetected) {
          expect(typeof data.complaintSummary).toBe("string");
          expect(data.complaintSummary).not.toBeNull();
        } else {
          expect(data.complaintSummary).toBeNull();
        }

        // Text fields
        expect(typeof data.customerIntent).toBe("string");
        expect(data.customerIntent.length).toBeGreaterThanOrEqual(5);

        expect(typeof data.recommendedAction).toBe("string");
        expect(data.recommendedAction.length).toBeGreaterThanOrEqual(10);

        expect(typeof data.conciseSummary).toBe("string");
        expect(data.conciseSummary.length).toBeGreaterThanOrEqual(10);
        expect(data.conciseSummary.length).toBeLessThanOrEqual(300);

        // Pain points
        expect(Array.isArray(data.painPoints)).toBe(true);
        expect(data.painPoints.length).toBeLessThanOrEqual(5);

        // Confidence scores
        expect(data.confidence).toBeDefined();
        expect(data.confidence.sentimentConfidence).toBeGreaterThanOrEqual(0);
        expect(data.confidence.sentimentConfidence).toBeLessThanOrEqual(1);
        expect(data.confidence.intentConfidence).toBeGreaterThanOrEqual(0);
        expect(data.confidence.intentConfidence).toBeLessThanOrEqual(1);
        expect(data.confidence.overallConfidence).toBeGreaterThanOrEqual(0);
        expect(data.confidence.overallConfidence).toBeLessThanOrEqual(1);

        // Spam and ambiguity flags
        expect(typeof data.isSpam).toBe("boolean");
        expect(typeof data.isAmbiguous).toBe("boolean");

        // Token usage
        expect(response.usage.promptTokens).toBeGreaterThanOrEqual(0);
        expect(response.usage.completionTokens).toBeGreaterThanOrEqual(0);
        expect(response.usage.totalTokens).toBeGreaterThanOrEqual(0);

        // Latency
        expect(response.latencyMs).toBeGreaterThanOrEqual(0);

        // Cost (if model has pricing metadata)
        if (response.usage.estimatedCostUsd !== undefined) {
          expect(response.usage.estimatedCostUsd).toBeGreaterThanOrEqual(0);
        }

        // For this test input (billing complaint), we expect negative sentiment
        expect(
          ["very_negative", "negative"].includes(data.sentiment)
        ).toBe(true);
        expect(data.complaintDetected).toBe(true);
        expect(
          ["refund_request", "complaint", "churn_threat"].includes(data.intent)
        ).toBe(true);

        console.log("✓ OmniRoute Structured Analysis passed validation");
        console.log(
          `  Tokens used: ${response.usage.promptTokens} prompt + ${response.usage.completionTokens} completion`
        );
        if (response.usage.estimatedCostUsd) {
          console.log(`  Estimated cost: $${response.usage.estimatedCostUsd.toFixed(4)}`);
        }
        console.log(`  Latency: ${response.latencyMs}ms`);
      });

      it("should handle positive feedback correctly", async () => {
        const testFeedback = `
          Absolutely love your product! The UI is intuitive, performance is blazing fast,
          and your customer support team went above and beyond to help us integrate it.
          Best decision we made this year.
        `.trim();

        const response = await adapter.generateStructured({
          messages: [
            {
              role: "user",
              content: `Analyze this customer feedback:\n\n${testFeedback}`,
            },
          ],
          schema: FeedbackAnalysisSchema,
          schemaName: "FeedbackAnalysisSchema",
          model: "gemini-3.1-pro", // Explicitly use Gemini model
          timeoutMs: 30000,
        });

        const data = response.data;

        // For positive feedback
        expect(
          ["very_positive", "positive"].includes(data.sentiment)
        ).toBe(true);
        expect(data.sentimentScore).toBeGreaterThan(0);
        expect(data.complaintDetected).toBe(false);
        expect(data.complaintSummary).toBeNull();
        expect(data.intent).toBe("praise");

        console.log("✓ OmniRoute Positive Feedback analysis passed");
      });
    });

    describe("Authentication & Error Handling", () => {
      it("should throw AIAuthenticationError when API key is invalid", async () => {
        const invalidAdapter = new OmniRouteAdapter({
          apiKey: "invalid-fake-key-12345",
          baseUrl,
        });

        const testFeedback = "Quick test feedback";

        // OmniRoute should reject the invalid key
        await expect(
          invalidAdapter.generateStructured({
            messages: [
              {
                role: "user",
                content: `Analyze: ${testFeedback}`,
              },
            ],
            schema: FeedbackAnalysisSchema,
            schemaName: "FeedbackAnalysisSchema",
            timeoutMs: 10000,
          })
        ).rejects.toThrow(AIAuthenticationError);

        console.log("✓ Invalid API key correctly rejected");
      });

      it("should throw AIAuthenticationError when adapter is initialized without API key", async () => {
        const noKeyAdapter = new OmniRouteAdapter({
          apiKey: "",
          baseUrl,
        });

        await expect(
          noKeyAdapter.generateStructured({
            messages: [
              {
                role: "user",
                content: "Test",
              },
            ],
            schema: FeedbackAnalysisSchema,
            schemaName: "FeedbackAnalysisSchema",
          })
        ).rejects.toThrow(AIAuthenticationError);

        console.log("✓ Missing API key correctly detected");
      });
    });

    describe("Health Check", () => {
      it("should verify OmniRoute Gateway connectivity via health check", async () => {
        const health = await adapter.healthCheck();

        expect(health).toBeDefined();
        expect(health.provider).toBe("omniroute");
        expect(typeof health.healthy).toBe("boolean");
        expect(typeof health.message).toBe("string");

        if (health.healthy) {
          expect(health.latencyMs).toBeGreaterThanOrEqual(0);
          console.log(
            `✓ OmniRoute Gateway healthy (latency: ${health.latencyMs}ms)`
          );
        } else {
          console.warn(`⚠ OmniRoute Gateway reported unhealthy: ${health.message}`);
        }
      });
    });

    describe("Model Configuration", () => {
      it("should resolve model configurations correctly", () => {
        const standardModel = adapter.getModelConfig("standard");
        expect(standardModel).toBeDefined();
        expect(standardModel.supportsStructuredOutput).toBe(true);

        const allModels = adapter.listAvailableModels();
        expect(Array.isArray(allModels)).toBe(true);
        expect(allModels.length).toBeGreaterThan(0);

        console.log(`✓ ${allModels.length} models available in catalog`);
      });
    });
  }
);

// Informational message when tests are skipped
describe("OmniRoute Live Integration Tests (Skipped)", () => {
  it.skipIf(shouldRunLiveTests)(
    "should be run with: CXPULSE_LIVE_INTEGRATION_TESTS=1 npm test -- tests/ai/omniroute-provider-live.test.ts",
    () => {
      expect(true).toBe(true);
      console.log(
        "\n⏭️  Skipping live OmniRoute tests. To enable, set:\n   export CXPULSE_LIVE_INTEGRATION_TESTS=1\n"
      );
    }
  );
});
