import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EvaluationRunner } from "../../src/lib/analysis/eval/evaluator";
import { GOLDEN_EVALUATION_DATASET } from "../../src/lib/analysis/eval/dataset";
import { PromptComparator } from "../../src/lib/analysis/eval/comparator";
import { FeedbackAnalysisService } from "../../src/lib/analysis/engine";
import { MockAIProvider } from "../../src/lib/ai/adapters/mock-adapter";
import { setDefaultAIProvider, resetDefaultAIProvider } from "../../src/lib/ai/provider";

describe("Phase 11: AI Evaluation Framework", () => {
  let mockProvider: MockAIProvider;
  let service: FeedbackAnalysisService;

  beforeEach(() => {
    vi.restoreAllMocks();
    resetDefaultAIProvider();
    mockProvider = new MockAIProvider();
    setDefaultAIProvider(mockProvider);

    // Setup mock handler for Golden Dataset
    mockProvider.setCustomStructuredHandler(async (req) => {
      const userPrompt = req.messages.find((m) => m.role === "user")?.content || "";
      const matchedItem = GOLDEN_EVALUATION_DATASET.find((item) =>
        userPrompt.includes(item.feedbackText.slice(0, 30))
      );

      if (matchedItem) {
        return {
          data: {
            sentiment: Array.isArray(matchedItem.expected.sentiment) ? matchedItem.expected.sentiment[0] : matchedItem.expected.sentiment,
            sentimentScore: (matchedItem.expected.sentimentScoreRange[0] + matchedItem.expected.sentimentScoreRange[1]) / 2,
            emotion: Array.isArray(matchedItem.expected.emotion) ? matchedItem.expected.emotion[0] : matchedItem.expected.emotion,
            intent: Array.isArray(matchedItem.expected.intent) ? matchedItem.expected.intent[0] : matchedItem.expected.intent,
            severity: Array.isArray(matchedItem.expected.severity) ? matchedItem.expected.severity[0] : matchedItem.expected.severity,
            topics: matchedItem.expected.expectedTopics.length > 0 ? matchedItem.expected.expectedTopics : ["general_feedback"],
            complaintDetected: matchedItem.expected.complaintDetected,
            complaintSummary: matchedItem.expected.complaintDetected ? `Complaint regarding ${matchedItem.category}` : null,
            customerIntent: "Simulated intent",
            recommendedAction: "Simulated action",
            conciseSummary: "Simulated summary",
            painPoints: [],
            confidence: { sentimentConfidence: 0.9, intentConfidence: 0.9, overallConfidence: 0.9 },
            isSpam: matchedItem.expected.isSpam,
            isAmbiguous: matchedItem.expected.isAmbiguous,
          },
          content: {}, // Not used by mock provider helper
          rawText: "{}",
          model: req.model || "claude-test",
          provider: "MockAI",
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150, costUsd: 0.0005 },
          latencyMs: 10,
          finishReason: "stop",
          promptVersion: req.promptVersion || "v1.0.0",
        };
      }
      throw new Error("No match in golden dataset for prompt");
    });

    service = FeedbackAnalysisService.getInstance();
  });

  afterEach(() => {
    resetDefaultAIProvider();
  });

  it("should run evaluation on the full golden dataset and produce a valid report", async () => {
    const runner = new EvaluationRunner(service);
    const report = await runner.runEvaluation(GOLDEN_EVALUATION_DATASET, {
      model: "claude-test",
      promptVersion: "v1.0.0",
      persist: false,
    });

    expect(report.totalSamples).toBe(GOLDEN_EVALUATION_DATASET.length);
    expect(report.overallPassRate).toBeGreaterThanOrEqual(0);
    expect(report.metrics.sentiment.accuracy).toBeGreaterThanOrEqual(0);
    expect(report.telemetry.totalCostUsd).toBeGreaterThanOrEqual(0);
  });

  it("should detect regressions when prompt version output changes negatively", async () => {
    const runner = new EvaluationRunner(service);

    // Baseline: v1.0.0 (Everything passes, as mocked)
    const baseline = await runner.runEvaluation(GOLDEN_EVALUATION_DATASET, { promptVersion: "v1.0.0" });

    // Candidate v2.0.0: Inject a regression for demonstration
    mockProvider.setCustomStructuredHandler(async (req) => {
      const userPrompt = req.messages.find((m) => m.role === "user")?.content || "";
      const matchedItem = GOLDEN_EVALUATION_DATASET.find((item) =>
        userPrompt.includes(item.feedbackText.slice(0, 30))
      );

      if (matchedItem) {
        const isRegressedItem = matchedItem.id === GOLDEN_EVALUATION_DATASET[0].id;
        return {
          data: {
            sentiment: isRegressedItem ? "very_negative" : (Array.isArray(matchedItem.expected.sentiment) ? matchedItem.expected.sentiment[0] : matchedItem.expected.sentiment),
            sentimentScore: isRegressedItem ? -0.99 : (matchedItem.expected.sentimentScoreRange[0] + matchedItem.expected.sentimentScoreRange[1]) / 2,
            emotion: isRegressedItem ? "anger" : (Array.isArray(matchedItem.expected.emotion) ? matchedItem.expected.emotion[0] : matchedItem.expected.emotion),
            intent: isRegressedItem ? "complaint" : (Array.isArray(matchedItem.expected.intent) ? matchedItem.expected.intent[0] : matchedItem.expected.intent),
            severity: isRegressedItem ? "critical" : (Array.isArray(matchedItem.expected.severity) ? matchedItem.expected.severity[0] : matchedItem.expected.severity),
            topics: matchedItem.expected.expectedTopics.length > 0 ? matchedItem.expected.expectedTopics : ["general_feedback"],
            complaintDetected: isRegressedItem ? true : matchedItem.expected.complaintDetected,
            complaintSummary: isRegressedItem ? "Injected test regression" : (matchedItem.expected.complaintDetected ? `Complaint regarding ${matchedItem.category}` : null),
            customerIntent: "Simulated intent",
            recommendedAction: "Simulated action",
            conciseSummary: "Simulated summary",
            painPoints: [],
            confidence: { sentimentConfidence: 0.9, intentConfidence: 0.9, overallConfidence: 0.9 },
            isSpam: matchedItem.expected.isSpam,
            isAmbiguous: matchedItem.expected.isAmbiguous,
          },
          content: {},
          rawText: "{}",
          model: req.model || "claude-test",
          provider: "MockAI",
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150, costUsd: 0.0005 },
          latencyMs: 10,
          finishReason: "stop",
          promptVersion: req.promptVersion || "v2.0.0",
        };
      }
      throw new Error("No match in golden dataset for prompt");
    });

    const candidate = await runner.runEvaluation(GOLDEN_EVALUATION_DATASET, { promptVersion: "v2.0.0" });
    const comparison = PromptComparator.compare(baseline, candidate);

    expect(comparison.regressions.length).toBeGreaterThan(0);
    expect(comparison.summary.overallPassRate.improved).toBe(false);
  });
});
