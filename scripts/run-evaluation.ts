#!/usr/bin/env tsx
import { EvaluationRunner } from "../src/lib/analysis/eval/evaluator";
import { PromptComparator } from "../src/lib/analysis/eval/comparator";
import { GOLDEN_EVALUATION_DATASET } from "../src/lib/analysis/eval/dataset";
import { FeedbackAnalysisService } from "../src/lib/analysis/engine";
import { MockAIProvider } from "../src/lib/ai/adapters/mock-adapter";
import { setDefaultAIProvider } from "../src/lib/ai/provider";
import { FeedbackAnalysisResult } from "../src/lib/analysis/schemas";

async function main() {
  const args = process.argv.slice(2);
  const isCompare = args.includes("--compare");
  const isMock = args.includes("--mock") || !process.env.OMNIROUTE_API_KEY;
  const modelIndex = args.indexOf("--model");
  const modelArg = modelIndex !== -1 ? args[modelIndex + 1] : "anthropic/claude-3-5-sonnet";
  const versionIndex = args.indexOf("--version");
  const versionArg = versionIndex !== -1 ? args[versionIndex + 1] : "v1.0.0";

  console.log("================================================================================");
  console.log("🚀 Customer Experience Intelligence SaaS - AI Evaluation Benchmark");
  console.log("================================================================================");
  console.log(`Execution Mode: ${isMock ? "Mock / Deterministic Simulator" : "Live OmniRoute Gateway"}`);
  console.log(`Dataset Size:   ${GOLDEN_EVALUATION_DATASET.length} Gold-Standard Items`);
  console.log(`Target Model:   ${modelArg}`);
  console.log(`Prompt Version: ${versionArg}`);
  console.log(`Compare Mode:   ${isCompare ? "Active (v1.0.0 vs v2.0.0)" : "Single Run"}`);
  console.log("--------------------------------------------------------------------------------\n");

  if (isMock) {
    // Setup Mock AI Provider with realistic simulated responses for dataset
    const mockProvider = new MockAIProvider();
    mockProvider.setCustomStructuredHandler(async (req) => {
      const userPrompt = req.messages.find((m) => m.role === "user")?.content || "";

      // Match prompt against dataset items to simulate intelligent model output
      const matchedItem = GOLDEN_EVALUATION_DATASET.find((item) =>
        userPrompt.includes(item.feedbackText.slice(0, 30))
      );

      const isV2 = req.promptVersion === "v2.0.0" || userPrompt.includes("v2.0.0");

      if (matchedItem) {
        const expSentiment = Array.isArray(matchedItem.expected.sentiment)
          ? matchedItem.expected.sentiment[0]
          : matchedItem.expected.sentiment;
        const expEmotion = Array.isArray(matchedItem.expected.emotion)
          ? matchedItem.expected.emotion[0]
          : matchedItem.expected.emotion;
        const expIntent = Array.isArray(matchedItem.expected.intent)
          ? matchedItem.expected.intent[0]
          : matchedItem.expected.intent;
        const expSeverity = Array.isArray(matchedItem.expected.severity)
          ? matchedItem.expected.severity[0]
          : matchedItem.expected.severity;

        const [minS, maxS] = matchedItem.expected.sentimentScoreRange;
        const simScore = (minS + maxS) / 2;

        const simulatedResult: FeedbackAnalysisResult = {
          sentiment: expSentiment,
          sentimentScore: simScore,
          emotion: expEmotion,
          intent: expIntent,
          severity: expSeverity,
          topics: matchedItem.expected.expectedTopics.length > 0 ? matchedItem.expected.expectedTopics : ["general_feedback"],
          complaintDetected: matchedItem.expected.complaintDetected,
          complaintSummary: matchedItem.expected.complaintDetected ? `Complaint regarding ${matchedItem.category}` : null,
          customerIntent: `Customer expressing intent related to ${expIntent}`,
          recommendedAction: `Follow standard playbook for ${matchedItem.category}`,
          conciseSummary: `Executive summary for ${matchedItem.category} feedback`,
          painPoints: matchedItem.expected.complaintDetected ? [`Issue with ${matchedItem.category}`] : [],
          confidence: {
            sentimentConfidence: 0.92,
            intentConfidence: 0.88,
            overallConfidence: 0.90,
          },
          isSpam: matchedItem.expected.isSpam,
          isAmbiguous: matchedItem.expected.isAmbiguous,
        };

        // In V1, introduce 1 simulated ambiguity edge case regression for comparison demonstration
        if (!isV2 && matchedItem.id === "gold-amb-003") {
          simulatedResult.isAmbiguous = false;
        }

        return {
          data: simulatedResult,
          content: simulatedResult,
          rawText: JSON.stringify(simulatedResult),
          model: req.model || modelArg,
          provider: "MockAI",
          usage: {
            promptTokens: 120,
            completionTokens: 65,
            totalTokens: 185,
            costUsd: 0.00075,
          },
          latencyMs: 15,
          finishReason: "stop",
          promptVersion: req.promptVersion,
        };
      }

      // Default fallback
      const defaultResult: FeedbackAnalysisResult = {
        sentiment: "neutral",
        sentimentScore: 0.0,
        emotion: "neutral",
        intent: "general_feedback",
        severity: "low",
        topics: ["general"],
        complaintDetected: false,
        complaintSummary: null,
        customerIntent: "General inquiry",
        recommendedAction: "Review feedback",
        conciseSummary: "Customer provided feedback",
        painPoints: [],
        confidence: { sentimentConfidence: 0.8, intentConfidence: 0.8, overallConfidence: 0.8 },
        isSpam: false,
        isAmbiguous: false,
      };

      return {
        data: defaultResult,
        content: defaultResult,
        rawText: JSON.stringify(defaultResult),
        model: req.model || modelArg,
        provider: "MockAI",
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150, costUsd: 0.0005 },
        latencyMs: 15,
        finishReason: "stop",
        promptVersion: req.promptVersion,
      };
    });

    setDefaultAIProvider(mockProvider);
  }

  const service = FeedbackAnalysisService.getInstance();
  const runner = new EvaluationRunner(service);

  if (isCompare) {
    console.log("Running Baseline Evaluation (cx-feedback-analysis@v1.0.0)...");
    const baselineReport = await runner.runEvaluation(GOLDEN_EVALUATION_DATASET, {
      model: modelArg,
      promptVersion: "v1.0.0",
      persist: false,
    });

    console.log("Running Candidate Evaluation (cx-feedback-analysis@v2.0.0)...");
    const candidateReport = await runner.runEvaluation(GOLDEN_EVALUATION_DATASET, {
      model: modelArg,
      promptVersion: "v2.0.0",
      persist: false,
    });

    const comparison = PromptComparator.compare(
      baselineReport,
      candidateReport,
      `${modelArg}@v1.0.0`,
      `${modelArg}@v2.0.0`
    );

    console.log(PromptComparator.formatMarkdown(comparison));
  } else {
    console.log(`Running Single Evaluation for ${modelArg}@${versionArg}...`);
    const report = await runner.runEvaluation(GOLDEN_EVALUATION_DATASET, {
      model: modelArg,
      promptVersion: versionArg,
      persist: false,
    });

    console.log(`
# 📊 AI Evaluation Report (${report.model}@${report.promptVersion})
*Total Samples*: ${report.totalSamples}
*Pass Rate*: ${(report.overallPassRate * 100).toFixed(1)}% (${report.itemScores.filter(s => s.passed).length}/${report.totalSamples})
*Sentiment Accuracy*: ${(report.metrics.sentiment.accuracy * 100).toFixed(1)}% (MAE: ${report.metrics.sentimentScoreMae.toFixed(3)})
*Emotion Accuracy*: ${(report.metrics.emotion.accuracy * 100).toFixed(1)}%
*Intent Accuracy*: ${(report.metrics.intent.accuracy * 100).toFixed(1)}%
*Severity Accuracy*: ${(report.metrics.severity.accuracy * 100).toFixed(1)}%
*Complaint Detection F1*: ${((report.metrics.complaintDetection.f1Score || 0) * 100).toFixed(1)}% (Precision: ${((report.metrics.complaintDetection.precision || 0) * 100).toFixed(1)}%, Recall: ${((report.metrics.complaintDetection.recall || 0) * 100).toFixed(1)}%)
*Spam Detection F1*: ${((report.metrics.spamDetection.f1Score || 0) * 100).toFixed(1)}%
*Ambiguity Accuracy*: ${(report.metrics.ambiguityDetection.accuracy * 100).toFixed(1)}%

---
*Avg Latency*: ${report.telemetry.avgLatencyMs.toFixed(0)}ms (p95: ${report.telemetry.p95LatencyMs.toFixed(0)}ms)
*Avg Cost / Item*: $${report.telemetry.avgCostPerItemUsd.toFixed(6)}
*Total Benchmark Cost*: $${report.telemetry.totalCostUsd.toFixed(5)}
`);

    const failedItems = report.itemScores.filter(s => !s.passed);
    if (failedItems.length > 0) {
      console.log(`\n❌ Failed Items (${failedItems.length}):`);
      for (const item of failedItems) {
        console.log(`- **${item.itemId}** [${item.category}]:\n  * ${item.failureDetails?.join("\n  * ")}`);
      }
    } else {
      console.log("\n✅ All 35 gold-standard evaluation items passed with 100% accuracy!");
    }
  }
}

main().catch((err) => {
  console.error("Evaluation run failed with error:", err);
  process.exit(1);
});
