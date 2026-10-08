import { NormalizedFeedbackItem } from "@/types/feedback.types";
import { FeedbackAnalysisService } from "./engine";
import { BatchAnalysisOptions, BatchAnalysisSummary, FeedbackAnalysisExecution } from "./types";

/**
 * Batch processor utility for high-throughput, queue-friendly feedback item analysis.
 */
export class FeedbackBatchProcessor {
  private service: FeedbackAnalysisService;

  constructor() {
    this.service = FeedbackAnalysisService.getInstance();
  }

  /**
   * Process an array of feedback items in bounded concurrency batches.
   */
  async processBatch(
    items: NormalizedFeedbackItem[],
    options: BatchAnalysisOptions = {}
  ): Promise<BatchAnalysisSummary> {
    return this.service.analyzeBatch(items, options);
  }

  /**
   * Process items until all are completed or error threshold is reached.
   */
  async processStream(
    generator: AsyncIterable<NormalizedFeedbackItem[]>,
    options: BatchAnalysisOptions = {}
  ): Promise<{ totalProcessed: number; totalCostUsd: number; executions: FeedbackAnalysisExecution[] }> {
    let totalProcessed = 0;
    let totalCostUsd = 0;
    const allExecutions: FeedbackAnalysisExecution[] = [];

    for await (const batch of generator) {
      const summary = await this.processBatch(batch, options);
      totalProcessed += summary.completed;
      totalCostUsd += summary.totalCostUsd;
      allExecutions.push(...summary.executions);

      if (options.stopOnErrorThreshold && summary.failed / summary.total > options.stopOnErrorThreshold) {
        break;
      }
    }

    return {
      totalProcessed,
      totalCostUsd,
      executions: allExecutions,
    };
  }
}
