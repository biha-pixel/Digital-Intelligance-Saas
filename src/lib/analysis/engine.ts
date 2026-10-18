import {
  FeedbackAnalysisSchema
} from "./schemas";
import {
  AnalysisOptions,
  FeedbackAnalysisExecution,
  BatchAnalysisOptions,
  BatchAnalysisSummary
} from "./types";
import { NormalizedFeedbackItem } from "@/types/feedback.types";
import { getAIProvider } from "@/lib/ai/provider";
import { getOmniRouteConfig } from "@/lib/ai/config";
import { PromptRegistry } from "@/lib/ai/prompt-versioning";
import "./prompts";
import { FeedbackAnalysisPromptVariables } from "./prompts";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

export class FeedbackAnalysisService {
  private static instance: FeedbackAnalysisService;
  private supabaseClient?: SupabaseClient;

  constructor(supabaseClient?: SupabaseClient) {
    this.supabaseClient = supabaseClient;
  }

  static getInstance(supabaseClient?: SupabaseClient): FeedbackAnalysisService {
    if (!FeedbackAnalysisService.instance || supabaseClient) {
      const instance = new FeedbackAnalysisService(supabaseClient);
      if (!supabaseClient) {
        FeedbackAnalysisService.instance = instance;
      }
      return instance;
    }
    return FeedbackAnalysisService.instance;
  }

  private async getClient() {
    if (this.supabaseClient) return this.supabaseClient;
    try {
      return await createClient();
    } catch {
      return createAdminClient();
    }
  }

  /**
   * Analyzes an individual feedback item.
   */
  async analyzeFeedbackItem(
    item: NormalizedFeedbackItem,
    options: AnalysisOptions = {}
  ): Promise<FeedbackAnalysisExecution> {
    const startTime = Date.now();
    const {
      model,
      promptVersion = "v1.0.0",
      persist = true,
      organizationId = item.organization_id,
      companyContext,
      timeoutMs
    } = options;

    const execution: FeedbackAnalysisExecution = {
      feedbackItemId: item.id || "unpersisted-item",
      organizationId,
      status: "processing",
      model: model || "anthropic/claude-3-5-sonnet",
      provider: "omniroute",
      promptVersion,
      analyzedAt: new Date().toISOString(),
      durationMs: 0,
      promptTokens: 0,
      completionTokens: 0,
      costUsd: 0,
    };

    try {
      // 1. Deterministic Pre-checks & Guards
      const text = item.content_text ? item.content_text.trim() : "";
      if (text.length < 2) {
        throw new Error("Feedback content is too brief or empty for meaningful analysis");
      }

      // 2. Fetch Versioned Prompt Template
      const registry = PromptRegistry.getInstance();
      const template = registry.get<FeedbackAnalysisPromptVariables>("cx-feedback-analysis", promptVersion);
      if (!template) {
        throw new Error(`Prompt template 'cx-feedback-analysis' version '${promptVersion}' not found in registry`);
      }

      // Format Company Context
      const formattedContext = companyContext
        ? `${companyContext.name || "Unknown Company"} (${companyContext.industry || "General Industry"}). Features: ${companyContext.keyFeatures?.join(", ") || "Standard"}`
        : "Standard Software/SaaS Product";

      const userPrompt = template.format({
        feedbackText: text,
        rating: item.rating !== undefined && item.rating !== null ? item.rating : "N/A",
        sourceType: item.source_type,
        author: item.author_display_name || item.author_identifier || "Anonymous",
        companyContext: formattedContext,
      });

      const systemPrompt = template.formatSystem({
        feedbackText: text,
        rating: item.rating !== undefined && item.rating !== null ? item.rating : "N/A",
        sourceType: item.source_type,
        author: item.author_display_name || item.author_identifier || "Anonymous",
        companyContext: formattedContext,
      });

      // 3. AI Execution via Zero-Trust Structured Output
      const targetModel = model || getOmniRouteConfig().defaultModel || template.defaultModel || "anthropic/claude-3-5-sonnet";
      execution.model = targetModel;
      const provider = getAIProvider();
      execution.provider = provider.name;

      const response = await provider.generateStructured({
        messages: [{ role: "user", content: userPrompt }],
        systemPrompt,
        schema: FeedbackAnalysisSchema,
        model: targetModel,
        promptVersion,
        timeoutMs,
      });

      const result = response.data;
      const usage = response.usage;

      // 4. Deterministic Post-Processing & Logical Invariant Defense
      // Rule 1: If complaintDetected is false, complaintSummary must be null
      if (!result.complaintDetected) {
        result.complaintSummary = null;
      } else if (!result.complaintSummary) {
        // Fallback if model marked complaintDetected true but missed summary
        result.complaintSummary = result.conciseSummary;
      }

      // Rule 2: Bound confidence scores between 0.0 and 1.0
      result.confidence.sentimentConfidence = Math.min(1, Math.max(0, result.confidence.sentimentConfidence));
      result.confidence.intentConfidence = Math.min(1, Math.max(0, result.confidence.intentConfidence));
      result.confidence.overallConfidence = Math.min(1, Math.max(0, result.confidence.overallConfidence));

      // Rule 3: If marked as ambiguous or spam, clamp overall confidence
      if (result.isAmbiguous || result.isSpam) {
        result.confidence.overallConfidence = Math.min(result.confidence.overallConfidence, 0.65);
      }

      execution.status = "completed";
      execution.result = result;
      execution.confidence = result.confidence;
      execution.promptTokens = usage.promptTokens;
      execution.completionTokens = usage.completionTokens;
      execution.costUsd = usage.estimatedCostUsd ?? 0;

      // 5. Database Persistence (when enabled and item has persistent ID)
      if (persist && item.id) {
        try {
          const supabase = await this.getClient();

          // Calculate churn risk score based on severity & intent
          let churnRisk = 0.0;
          if (result.intent === "churn_threat") churnRisk = 0.95;
          else if (result.intent === "refund_request") churnRisk = 0.75;
          else if (result.severity === "critical") churnRisk = 0.85;
          else if (result.severity === "high") churnRisk = 0.50;
          else if (result.sentiment === "very_negative") churnRisk = 0.40;

          // Insert analysis record into feedback_analyses
          const { data, error } = await supabase
            .from("feedback_analyses")
            .insert({
              organization_id: organizationId,
              feedback_item_id: item.id,
              model_name: execution.model,
              prompt_tokens: execution.promptTokens,
              completion_tokens: execution.completionTokens,
              cost_usd: execution.costUsd,
              sentiment_breakdown: {
                label: result.sentiment,
                score: result.sentimentScore,
                emotion: result.emotion,
                confidence: result.confidence.sentimentConfidence,
              },
              extracted_topics: result.topics,
              customer_pain_points: result.painPoints,
              churn_risk_score: churnRisk,
              suggested_action: result.recommendedAction,
              raw_response: JSON.parse(JSON.stringify(result)),
            })
            .select("id")
            .single();

          if (!error && data) {
            execution.id = data.id;
          }

          // Update feedback_items with analytical tags
          await supabase
            .from("feedback_items")
            .update({
              sentiment_label: result.sentiment,
              sentiment_score: result.sentimentScore,
              topics: result.topics,
              intent: result.intent,
              updated_at: new Date().toISOString(),
            })
            .eq("id", item.id);

        } catch (dbErr: any) {
          // Log DB error without failing in-memory analytical payload
          console.error("Database persistence warning for feedback analysis:", dbErr);
        }
      }

    } catch (error: any) {
      execution.status = "failed";
      execution.failureReason = error.message || "Unknown error during feedback analysis";
    }

    execution.durationMs = Date.now() - startTime;
    return execution;
  }

  /**
   * Analyzes a collection of feedback items with concurrency control.
   */
  async analyzeBatch(
    items: NormalizedFeedbackItem[],
    options: BatchAnalysisOptions = {}
  ): Promise<BatchAnalysisSummary> {
    const startTime = Date.now();
    const concurrency = Math.max(1, options.concurrency || 3);
    const executions: FeedbackAnalysisExecution[] = [];

    let completed = 0;
    let failed = 0;
    let skipped = 0;
    let totalTokens = 0;
    let totalCostUsd = 0;

    // Process items in concurrency-controlled chunks
    for (let i = 0; i < items.length; i += concurrency) {
      const chunk = items.slice(i, i + concurrency);

      const chunkPromises = chunk.map(async (item) => {
        // Skip invalid items
        if (!item || !item.content_text) {
          skipped++;
          return null;
        }

        const res = await this.analyzeFeedbackItem(item, options);
        if (res.status === "completed") {
          completed++;
          totalTokens += res.promptTokens + res.completionTokens;
          totalCostUsd += res.costUsd;
        } else {
          failed++;
        }
        return res;
      });

      const chunkResults = await Promise.all(chunkPromises);
      for (const res of chunkResults) {
        if (res) executions.push(res);
      }

      // Check error threshold if configured
      if (options.stopOnErrorThreshold && items.length > 0) {
        const errorRate = failed / (completed + failed);
        if (errorRate >= options.stopOnErrorThreshold && (completed + failed) >= 3) {
          console.warn(`Batch processing stopped: error rate ${(errorRate * 100).toFixed(1)}% exceeded threshold.`);
          break;
        }
      }
    }

    return {
      total: items.length,
      completed,
      failed,
      skipped,
      durationMs: Date.now() - startTime,
      totalTokens,
      totalCostUsd,
      executions,
    };
  }
}
