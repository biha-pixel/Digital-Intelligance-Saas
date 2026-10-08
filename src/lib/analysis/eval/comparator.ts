import { EvaluationReport } from "./evaluator";

export interface MetricDelta {
  baseline: number;
  candidate: number;
  delta: number;
  percentChange: number;
  improved: boolean;
}

export interface ComparisonReport {
  baselineLabel: string;
  candidateLabel: string;
  timestamp: string;
  summary: {
    overallPassRate: MetricDelta;
    sentimentAccuracy: MetricDelta;
    emotionAccuracy: MetricDelta;
    intentAccuracy: MetricDelta;
    severityAccuracy: MetricDelta;
    complaintF1: MetricDelta;
    spamF1: MetricDelta;
    ambiguityAccuracy: MetricDelta;
  };
  telemetry: {
    p95LatencyMs: MetricDelta;
    avgCostPerItemUsd: MetricDelta;
    totalCostUsd: MetricDelta;
  };
  regressions: Array<{
    itemId: string;
    category: string;
    baselinePassed: boolean;
    candidateFailures?: string[];
  }>;
  improvements: Array<{
    itemId: string;
    category: string;
    candidatePassed: boolean;
    baselineFailures?: string[];
  }>;
}

/**
 * Compares two evaluation runs to detect regressions, improvements, and cost/speed trade-offs.
 */
export class PromptComparator {
  /**
   * Compare a baseline report with a candidate report.
   */
  static compare(
    baseline: EvaluationReport,
    candidate: EvaluationReport,
    baselineLabel = `${baseline.model}@${baseline.promptVersion}`,
    candidateLabel = `${candidate.model}@${candidate.promptVersion}`
  ): ComparisonReport {
    const calcDelta = (baseVal: number, candVal: number, higherIsBetter = true): MetricDelta => {
      const delta = candVal - baseVal;
      const percentChange = baseVal !== 0 ? (delta / baseVal) * 100 : 0;
      const improved = higherIsBetter ? delta > 0 : delta < 0;
      return {
        baseline: baseVal,
        candidate: candVal,
        delta,
        percentChange,
        improved,
      };
    };

    // Find Regressions and Improvements
    const regressions: ComparisonReport["regressions"] = [];
    const improvements: ComparisonReport["improvements"] = [];

    const baselineMap = new Map(baseline.itemScores.map((i) => [i.itemId, i]));
    const candidateMap = new Map(candidate.itemScores.map((i) => [i.itemId, i]));

    for (const [id, candItem] of candidateMap.entries()) {
      const baseItem = baselineMap.get(id);
      if (baseItem) {
        if (baseItem.passed && !candItem.passed) {
          regressions.push({
            itemId: id,
            category: candItem.category,
            baselinePassed: true,
            candidateFailures: candItem.failureDetails,
          });
        } else if (!baseItem.passed && candItem.passed) {
          improvements.push({
            itemId: id,
            category: candItem.category,
            candidatePassed: true,
            baselineFailures: baseItem.failureDetails,
          });
        }
      }
    }

    return {
      baselineLabel,
      candidateLabel,
      timestamp: new Date().toISOString(),
      summary: {
        overallPassRate: calcDelta(baseline.overallPassRate, candidate.overallPassRate, true),
        sentimentAccuracy: calcDelta(baseline.metrics.sentiment.accuracy, candidate.metrics.sentiment.accuracy, true),
        emotionAccuracy: calcDelta(baseline.metrics.emotion.accuracy, candidate.metrics.emotion.accuracy, true),
        intentAccuracy: calcDelta(baseline.metrics.intent.accuracy, candidate.metrics.intent.accuracy, true),
        severityAccuracy: calcDelta(baseline.metrics.severity.accuracy, candidate.metrics.severity.accuracy, true),
        complaintF1: calcDelta(baseline.metrics.complaintDetection.f1Score || 0, candidate.metrics.complaintDetection.f1Score || 0, true),
        spamF1: calcDelta(baseline.metrics.spamDetection.f1Score || 0, candidate.metrics.spamDetection.f1Score || 0, true),
        ambiguityAccuracy: calcDelta(baseline.metrics.ambiguityDetection.accuracy, candidate.metrics.ambiguityDetection.accuracy, true),
      },
      telemetry: {
        p95LatencyMs: calcDelta(baseline.telemetry.p95LatencyMs, candidate.telemetry.p95LatencyMs, false),
        avgCostPerItemUsd: calcDelta(baseline.telemetry.avgCostPerItemUsd, candidate.telemetry.avgCostPerItemUsd, false),
        totalCostUsd: calcDelta(baseline.telemetry.totalCostUsd, candidate.telemetry.totalCostUsd, false),
      },
      regressions,
      improvements,
    };
  }

  /**
   * Format the comparison report into a clear Markdown terminal string.
   */
  static formatMarkdown(comparison: ComparisonReport): string {
    const formatDelta = (d: MetricDelta, isPercent = true, isCost = false) => {
      const sign = d.delta > 0 ? "+" : "";
      const baseFormatted = isCost ? `$${d.baseline.toFixed(5)}` : isPercent ? `${(d.baseline * 100).toFixed(1)}%` : `${d.baseline.toFixed(0)}ms`;
      const candFormatted = isCost ? `$${d.candidate.toFixed(5)}` : isPercent ? `${(d.candidate * 100).toFixed(1)}%` : `${d.candidate.toFixed(0)}ms`;
      const deltaFormatted = isCost ? `${sign}$${d.delta.toFixed(5)}` : isPercent ? `${sign}${(d.delta * 100).toFixed(1)}%` : `${sign}${d.delta.toFixed(0)}ms`;
      const indicator = d.delta === 0 ? "⚖️ Unchanged" : d.improved ? "✅ Better" : "⚠️ Worse";
      return `${baseFormatted} -> ${candFormatted} (${deltaFormatted}) [${indicator}]`;
    };

    return `
# 🔬 AI Evaluation Comparison Report
**Baseline**: \`${comparison.baselineLabel}\`
**Candidate**: \`${comparison.candidateLabel}\`
*Timestamp*: ${comparison.timestamp}

---

### 📊 Metric Performance
| Metric | Comparison |
| :--- | :--- |
| **Overall Pass Rate** | ${formatDelta(comparison.summary.overallPassRate)} |
| **Sentiment Accuracy** | ${formatDelta(comparison.summary.sentimentAccuracy)} |
| **Emotion Accuracy** | ${formatDelta(comparison.summary.emotionAccuracy)} |
| **Intent Accuracy** | ${formatDelta(comparison.summary.intentAccuracy)} |
| **Severity Accuracy** | ${formatDelta(comparison.summary.severityAccuracy)} |
| **Complaint F1 Score** | ${formatDelta(comparison.summary.complaintF1)} |
| **Spam F1 Score** | ${formatDelta(comparison.summary.spamF1)} |
| **Ambiguity Accuracy** | ${formatDelta(comparison.summary.ambiguityAccuracy)} |

---

### ⚡ Telemetry & Cost Efficiency
| Dimension | Comparison |
| :--- | :--- |
| **P95 Latency** | ${formatDelta(comparison.telemetry.p95LatencyMs, false)} |
| **Avg Cost / Item** | ${formatDelta(comparison.telemetry.avgCostPerItemUsd, false, true)} |
| **Total Benchmark Cost** | ${formatDelta(comparison.telemetry.totalCostUsd, false, true)} |

---

### 🚨 Regressions (${comparison.regressions.length})
${
  comparison.regressions.length === 0
    ? "✨ **Zero regressions detected.**"
    : comparison.regressions
        .map(
          (r) => `- **${r.itemId}** [${r.category}]:\n  * ${r.candidateFailures?.join("\n  * ")}`
        )
        .join("\n")
}

---

### 🌟 Improvements (${comparison.improvements.length})
${
  comparison.improvements.length === 0
    ? "ℹ️ No previously failed test cases improved."
    : comparison.improvements
        .map(
          (i) => `- **${i.itemId}** [${i.category}]: Previously failed on Baseline, now passing!`
        )
        .join("\n")
}
`;
  }
}
