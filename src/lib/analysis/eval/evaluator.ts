import { GoldenEvaluationItem, GOLDEN_EVALUATION_DATASET } from "./dataset";
import { FeedbackAnalysisService } from "../engine";
import { AnalysisOptions, FeedbackAnalysisExecution } from "../types";
import { NormalizedFeedbackItem } from "@/types/feedback.types";
import { FeedbackAnalysisResult } from "../schemas";

export interface ItemEvaluationScore {
  itemId: string;
  category: string;
  passed: boolean;
  sentimentMatched: boolean;
  emotionMatched: boolean;
  intentMatched: boolean;
  severityMatched: boolean;
  complaintMatched: boolean;
  spamMatched: boolean;
  ambiguityMatched: boolean;
  scoreDeviation: number;
  actual?: FeedbackAnalysisResult;
  failureDetails?: string[];
  executionTimeMs: number;
  costUsd: number;
}

export interface MetricSummary {
  accuracy: number;
  precision?: number;
  recall?: number;
  f1Score?: number;
}

export interface EvaluationReport {
  timestamp: string;
  model: string;
  promptVersion: string;
  totalSamples: number;
  successfulAnalyses: number;
  failedAnalyses: number;
  overallPassRate: number;
  metrics: {
    sentiment: MetricSummary;
    sentimentScoreMae: number;
    emotion: MetricSummary;
    intent: MetricSummary;
    severity: MetricSummary;
    complaintDetection: MetricSummary;
    spamDetection: MetricSummary;
    ambiguityDetection: MetricSummary;
  };
  telemetry: {
    totalDurationMs: number;
    avgLatencyMs: number;
    p50LatencyMs: number;
    p95LatencyMs: number;
    totalPromptTokens: number;
    totalCompletionTokens: number;
    totalCostUsd: number;
    avgCostPerItemUsd: number;
  };
  itemScores: ItemEvaluationScore[];
}

/**
 * Automated Evaluation Runner for Customer Feedback Intelligence AI.
 */
export class EvaluationRunner {
  private service: FeedbackAnalysisService;

  constructor(service?: FeedbackAnalysisService) {
    this.service = service || FeedbackAnalysisService.getInstance();
  }

  /**
   * Run the golden evaluation dataset through the AI analysis pipeline.
   */
  async runEvaluation(
    dataset: GoldenEvaluationItem[] = GOLDEN_EVALUATION_DATASET,
    options: AnalysisOptions = {}
  ): Promise<EvaluationReport> {
    const startTime = Date.now();
    const itemScores: ItemEvaluationScore[] = [];
    const latencies: number[] = [];

    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    let totalCostUsd = 0;
    let successfulCount = 0;
    let failedCount = 0;

    // Accuracy counters
    let sentimentMatches = 0;
    let emotionMatches = 0;
    let intentMatches = 0;
    let severityMatches = 0;
    let ambiguityMatches = 0;
    let totalScoreDeviation = 0;

    // Binary confusion matrix for Complaint Detection
    let complaintTP = 0, complaintFP = 0, complaintFN = 0, complaintTN = 0;
    // Binary confusion matrix for Spam Detection
    let spamTP = 0, spamFP = 0, spamFN = 0, spamTN = 0;

    for (const item of dataset) {
      const mockFeedbackItem: NormalizedFeedbackItem = {
        id: item.id,
        organization_id: "eval-org-benchmark",
        source_id: "eval-source",
        source_type: item.sourceType as any,
        content_text: item.feedbackText,
        rating: item.rating,
        author_display_name: item.author,
        author_identifier: `eval-author-${item.id}`,
        language_code: "en",
        word_count: item.feedbackText.split(/\s+/).length,
        content_hash: `eval-hash-${item.id}`,
      };

      const execution = await this.service.analyzeFeedbackItem(mockFeedbackItem, {
        ...options,
        persist: false, // Do not pollute DB during evals
      });

      latencies.push(execution.durationMs);
      totalPromptTokens += execution.promptTokens;
      totalCompletionTokens += execution.completionTokens;
      totalCostUsd += execution.costUsd;

      if (execution.status === "completed" && execution.result) {
        successfulCount++;
        const actual = execution.result;
        const failures: string[] = [];

        // 1. Sentiment Match Check
        const expSentiment = Array.isArray(item.expected.sentiment)
          ? item.expected.sentiment
          : [item.expected.sentiment];
        const sentimentMatched = expSentiment.includes(actual.sentiment);
        if (!sentimentMatched) {
          failures.push(`Sentiment expected [${expSentiment.join(", ")}], got '${actual.sentiment}'`);
        } else {
          sentimentMatches++;
        }

        // 2. Sentiment Score Deviation
        const [minScore, maxScore] = item.expected.sentimentScoreRange;
        const midScore = (minScore + maxScore) / 2;
        const deviation = Math.abs(actual.sentimentScore - midScore);
        totalScoreDeviation += deviation;

        // 3. Emotion Match Check
        const expEmotion = Array.isArray(item.expected.emotion)
          ? item.expected.emotion
          : [item.expected.emotion];
        const emotionMatched = expEmotion.includes(actual.emotion);
        if (!emotionMatched) {
          failures.push(`Emotion expected [${expEmotion.join(", ")}], got '${actual.emotion}'`);
        } else {
          emotionMatches++;
        }

        // 4. Intent Match Check
        const expIntent = Array.isArray(item.expected.intent)
          ? item.expected.intent
          : [item.expected.intent];
        const intentMatched = expIntent.includes(actual.intent);
        if (!intentMatched) {
          failures.push(`Intent expected [${expIntent.join(", ")}], got '${actual.intent}'`);
        } else {
          intentMatches++;
        }

        // 5. Severity Match Check
        const expSeverity = Array.isArray(item.expected.severity)
          ? item.expected.severity
          : [item.expected.severity];
        const severityMatched = expSeverity.includes(actual.severity);
        if (!severityMatched) {
          failures.push(`Severity expected [${expSeverity.join(", ")}], got '${actual.severity}'`);
        } else {
          severityMatches++;
        }

        // 6. Complaint Detection Confusion Matrix
        const complaintMatched = actual.complaintDetected === item.expected.complaintDetected;
        if (item.expected.complaintDetected && actual.complaintDetected) complaintTP++;
        else if (!item.expected.complaintDetected && actual.complaintDetected) complaintFP++;
        else if (item.expected.complaintDetected && !actual.complaintDetected) complaintFN++;
        else complaintTN++;
        if (!complaintMatched) {
          failures.push(`ComplaintDetected expected ${item.expected.complaintDetected}, got ${actual.complaintDetected}`);
        }

        // 7. Spam Detection Confusion Matrix
        const spamMatched = actual.isSpam === item.expected.isSpam;
        if (item.expected.isSpam && actual.isSpam) spamTP++;
        else if (!item.expected.isSpam && actual.isSpam) spamFP++;
        else if (item.expected.isSpam && !actual.isSpam) spamFN++;
        else spamTN++;
        if (!spamMatched) {
          failures.push(`isSpam expected ${item.expected.isSpam}, got ${actual.isSpam}`);
        }

        // 8. Ambiguity Match
        const ambiguityMatched = actual.isAmbiguous === item.expected.isAmbiguous;
        if (ambiguityMatched) ambiguityMatches++;
        else failures.push(`isAmbiguous expected ${item.expected.isAmbiguous}, got ${actual.isAmbiguous}`);

        const passed = failures.length === 0;

        itemScores.push({
          itemId: item.id,
          category: item.category,
          passed,
          sentimentMatched,
          emotionMatched,
          intentMatched,
          severityMatched,
          complaintMatched,
          spamMatched,
          ambiguityMatched,
          scoreDeviation: deviation,
          actual,
          failureDetails: failures.length > 0 ? failures : undefined,
          executionTimeMs: execution.durationMs,
          costUsd: execution.costUsd,
        });

      } else {
        failedCount++;
        itemScores.push({
          itemId: item.id,
          category: item.category,
          passed: false,
          sentimentMatched: false,
          emotionMatched: false,
          intentMatched: false,
          severityMatched: false,
          complaintMatched: false,
          spamMatched: false,
          ambiguityMatched: false,
          scoreDeviation: 1.0,
          failureDetails: [`Analysis execution failed: ${execution.failureReason}`],
          executionTimeMs: execution.durationMs,
          costUsd: 0,
        });
      }
    }

    // Helper for Precision / Recall / F1
    const calcMetrics = (tp: number, fp: number, fn: number, tn: number): MetricSummary => {
      const total = tp + fp + fn + tn;
      const accuracy = total > 0 ? (tp + tn) / total : 0;
      const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
      const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
      const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
      return { accuracy, precision, recall, f1Score };
    };

    const totalCount = dataset.length;
    latencies.sort((a, b) => a - b);
    const p50 = latencies[Math.floor(latencies.length * 0.50)] || 0;
    const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;

    const overallPassed = itemScores.filter((s) => s.passed).length;

    return {
      timestamp: new Date().toISOString(),
      model: options.model || "anthropic/claude-3-5-sonnet",
      promptVersion: options.promptVersion || "v1.0.0",
      totalSamples: totalCount,
      successfulAnalyses: successfulCount,
      failedAnalyses: failedCount,
      overallPassRate: totalCount > 0 ? overallPassed / totalCount : 0,
      metrics: {
        sentiment: { accuracy: totalCount > 0 ? sentimentMatches / totalCount : 0 },
        sentimentScoreMae: totalCount > 0 ? totalScoreDeviation / totalCount : 0,
        emotion: { accuracy: totalCount > 0 ? emotionMatches / totalCount : 0 },
        intent: { accuracy: totalCount > 0 ? intentMatches / totalCount : 0 },
        severity: { accuracy: totalCount > 0 ? severityMatches / totalCount : 0 },
        complaintDetection: calcMetrics(complaintTP, complaintFP, complaintFN, complaintTN),
        spamDetection: calcMetrics(spamTP, spamFP, spamFN, spamTN),
        ambiguityDetection: { accuracy: totalCount > 0 ? ambiguityMatches / totalCount : 0 },
      },
      telemetry: {
        totalDurationMs: Date.now() - startTime,
        avgLatencyMs: latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0,
        p50LatencyMs: p50,
        p95LatencyMs: p95,
        totalPromptTokens,
        totalCompletionTokens,
        totalCostUsd,
        avgCostPerItemUsd: totalCount > 0 ? totalCostUsd / totalCount : 0,
      },
      itemScores,
    };
  }
}
