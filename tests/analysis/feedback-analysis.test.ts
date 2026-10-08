import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { FeedbackAnalysisSchema, FeedbackAnalysisResult } from "../../src/lib/analysis/schemas";
import { FeedbackAnalysisService } from "../../src/lib/analysis/engine";
import { FeedbackBatchProcessor } from "../../src/lib/analysis/batch-processor";
import { MockAIProvider } from "../../src/lib/ai/adapters/mock-adapter";
import { setDefaultAIProvider, resetDefaultAIProvider } from "../../src/lib/ai/provider";
import { NormalizedFeedbackItem } from "../../src/types/feedback.types";
import { AIValidationError } from "../../src/lib/ai/errors";

describe("Phase 11: Feedback Analysis Engine", () => {
  let mockProvider: MockAIProvider;

  beforeEach(() => {
    vi.restoreAllMocks();
    resetDefaultAIProvider();
    mockProvider = new MockAIProvider();
    setDefaultAIProvider(mockProvider);
  });

  afterEach(() => {
    resetDefaultAIProvider();
  });

  describe("FeedbackAnalysisSchema - Zod Runtime Schema Validation", () => {
    it("should successfully validate a fully populated valid analysis object", () => {
      const validResult: FeedbackAnalysisResult = {
        sentiment: "very_negative",
        sentimentScore: -0.85,
        emotion: "anger",
        intent: "churn_threat",
        severity: "critical",
        topics: ["pricing", "billing", "customer_support"],
        complaintDetected: true,
        complaintSummary: "Customer was double billed and support did not respond",
        customerIntent: "Cancel subscription and switch to competitor",
        recommendedAction: "Escalate to Tier 3 CX management and issue immediate refund",
        conciseSummary: "Customer threatening churn due to unresolved double-billing.",
        painPoints: ["Unresponsive customer support", "Erroneous charge"],
        confidence: {
          sentimentConfidence: 0.95,
          intentConfidence: 0.90,
          overallConfidence: 0.92,
        },
        isSpam: false,
        isAmbiguous: false,
      };

      const parsed = FeedbackAnalysisSchema.safeParse(validResult);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.sentiment).toBe("very_negative");
        expect(parsed.data.severity).toBe("critical");
        expect(parsed.data.topics).toHaveLength(3);
      }
    });

    it("should allow complaintSummary to be null when complaintDetected is false", () => {
      const validPraise: FeedbackAnalysisResult = {
        sentiment: "very_positive",
        sentimentScore: 0.95,
        emotion: "joy",
        intent: "praise",
        severity: "low",
        topics: ["ui_ux", "product_quality"],
        complaintDetected: false,
        complaintSummary: null,
        customerIntent: "Express delight with the new v2 redesign",
        recommendedAction: "Send thank you note and invite to customer advisory board",
        conciseSummary: "Customer loved the new UI design and speed.",
        painPoints: [],
        confidence: {
          sentimentConfidence: 0.98,
          intentConfidence: 0.95,
          overallConfidence: 0.96,
        },
        isSpam: false,
        isAmbiguous: false,
      };

      const parsed = FeedbackAnalysisSchema.safeParse(validPraise);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.complaintSummary).toBeNull();
      }
    });

    it("should reject invalid sentiment enum value", () => {
      const invalidData = {
        sentiment: "super_happy", // Invalid enum
        sentimentScore: 0.5,
        emotion: "joy",
        intent: "praise",
        severity: "low",
        topics: ["ui"],
        complaintDetected: false,
        complaintSummary: null,
        customerIntent: "Praise product",
        recommendedAction: "Thank customer",
        conciseSummary: "Customer happy",
        painPoints: [],
        confidence: { sentimentConfidence: 0.9, intentConfidence: 0.9, overallConfidence: 0.9 },
        isSpam: false,
        isAmbiguous: false,
      };

      const parsed = FeedbackAnalysisSchema.safeParse(invalidData);
      expect(parsed.success).toBe(false);
    });

    it("should reject sentiment score outside -1.0 to 1.0 range", () => {
      const invalidScore = {
        sentiment: "positive",
        sentimentScore: 1.5, // Invalid! Max is 1.0
        emotion: "joy",
        intent: "praise",
        severity: "low",
        topics: ["ui"],
        complaintDetected: false,
        complaintSummary: null,
        customerIntent: "Praise product",
        recommendedAction: "Thank customer",
        conciseSummary: "Customer happy",
        painPoints: [],
        confidence: { sentimentConfidence: 0.9, intentConfidence: 0.9, overallConfidence: 0.9 },
        isSpam: false,
        isAmbiguous: false,
      };

      const parsed = FeedbackAnalysisSchema.safeParse(invalidScore);
      expect(parsed.success).toBe(false);
    });

    it("should reject empty topics list", () => {
      const emptyTopics = {
        sentiment: "neutral",
        sentimentScore: 0.0,
        emotion: "neutral",
        intent: "general_feedback",
        severity: "low",
        topics: [], // Invalid: min 1 topic
        complaintDetected: false,
        complaintSummary: null,
        customerIntent: "Inquire about features",
        recommendedAction: "Send docs",
        conciseSummary: "Customer inquiry",
        painPoints: [],
        confidence: { sentimentConfidence: 0.9, intentConfidence: 0.9, overallConfidence: 0.9 },
        isSpam: false,
        isAmbiguous: false,
      };

      const parsed = FeedbackAnalysisSchema.safeParse(emptyTopics);
      expect(parsed.success).toBe(false);
    });
  });

  describe("FeedbackAnalysisService - Engine Execution & Logic Invariants", () => {
    const service = FeedbackAnalysisService.getInstance();

    const sampleItem: NormalizedFeedbackItem = {
      id: "feedback-101",
      organization_id: "org-test-1",
      source_id: "src-1",
      source_type: "trustpilot",
      content_text: "The application is constantly freezing during PDF exports. Very frustrating.",
      rating: 1,
      author_display_name: "Alice Cooper",
      author_identifier: "author-alice",
      language_code: "en",
      word_count: 10,
      content_hash: "hash123",
    };

    it("should reject empty or ultra-short feedback content during pre-check", async () => {
      const emptyItem: NormalizedFeedbackItem = {
        ...sampleItem,
        content_text: " ",
      };

      const result = await service.analyzeFeedbackItem(emptyItem, { persist: false });
      expect(result.status).toBe("failed");
      expect(result.failureReason).toContain("too brief or empty");
    });

    it("should analyze valid feedback item and return structured execution", async () => {
      const mockResult: FeedbackAnalysisResult = {
        sentiment: "negative",
        sentimentScore: -0.7,
        emotion: "frustration",
        intent: "bug_report",
        severity: "high",
        topics: ["performance", "reliability"],
        complaintDetected: true,
        complaintSummary: "PDF export consistently freezes",
        customerIntent: "Report export freezing bug",
        recommendedAction: "Fix PDF renderer memory leak",
        conciseSummary: "Customer reports app freezing during PDF exports.",
        painPoints: ["Export crash", "Freezing UI"],
        confidence: {
          sentimentConfidence: 0.92,
          intentConfidence: 0.88,
          overallConfidence: 0.90,
        },
        isSpam: false,
        isAmbiguous: false,
      };

      mockProvider.enqueueStructuredResponse(mockResult);

      const execution = await service.analyzeFeedbackItem(sampleItem, {
        persist: false,
        model: "anthropic/claude-3-5-sonnet",
        promptVersion: "v1.0.0",
      });

      expect(execution.status).toBe("completed");
      expect(execution.model).toBe("anthropic/claude-3-5-sonnet");
      expect(execution.promptVersion).toBe("v1.0.0");
      expect(execution.result).toBeDefined();
      expect(execution.result?.sentiment).toBe("negative");
      expect(execution.result?.complaintDetected).toBe(true);
      expect(execution.result?.complaintSummary).toBe("PDF export consistently freezes");
      expect(execution.confidence?.overallConfidence).toBe(0.90);
    });

    it("should enforce invariant: set complaintSummary to null if complaintDetected is false", async () => {
      const mockResult: FeedbackAnalysisResult = {
        sentiment: "positive",
        sentimentScore: 0.8,
        emotion: "joy",
        intent: "praise",
        severity: "low",
        topics: ["ui_ux"],
        complaintDetected: false,
        complaintSummary: "Some stray string model hallucinated", // Invariant violation from raw AI
        customerIntent: "Praise user interface design",
        recommendedAction: "No specific operational action required",
        conciseSummary: "Great product experience",
        painPoints: [],
        confidence: { sentimentConfidence: 0.9, intentConfidence: 0.9, overallConfidence: 0.9 },
        isSpam: false,
        isAmbiguous: false,
      };

      mockProvider.enqueueStructuredResponse(mockResult);

      const execution = await service.analyzeFeedbackItem(sampleItem, { persist: false });
      expect(execution.status).toBe("completed");
      expect(execution.result?.complaintDetected).toBe(false);
      // Defensive invariant enforced:
      expect(execution.result?.complaintSummary).toBeNull();
    });

    it("should clamp overall confidence when item is marked as spam or ambiguous", async () => {
      const ambiguousMockResult: FeedbackAnalysisResult = {
        sentiment: "neutral",
        sentimentScore: 0.0,
        emotion: "confusion",
        intent: "general_feedback",
        severity: "low",
        topics: ["general"],
        complaintDetected: false,
        complaintSummary: null,
        customerIntent: "Unclear intent",
        recommendedAction: "Request more info",
        conciseSummary: "Ambiguous user comment",
        painPoints: [],
        confidence: {
          sentimentConfidence: 0.95,
          intentConfidence: 0.90,
          overallConfidence: 0.95, // Overconfident for ambiguous input
        },
        isSpam: false,
        isAmbiguous: true, // Ambiguous!
      };

      mockProvider.enqueueStructuredResponse(ambiguousMockResult);

      const execution = await service.analyzeFeedbackItem(sampleItem, { persist: false });
      expect(execution.status).toBe("completed");
      expect(execution.result?.isAmbiguous).toBe(true);
      // Overall confidence should be clamped to max 0.65
      expect(execution.result?.confidence.overallConfidence).toBeLessThanOrEqual(0.65);
    });
  });

  describe("FeedbackBatchProcessor - Batch Processing & Concurrency", () => {
    it("should process items in concurrency batches and aggregate summary metrics", async () => {
      const processor = new FeedbackBatchProcessor();

      const items: NormalizedFeedbackItem[] = [
        {
          id: "item-1",
          organization_id: "org-1",
          source_id: "src-1",
          source_type: "g2",
          content_text: "Excellent tool, fast onboarding.",
          rating: 5,
          author_identifier: "author-1",
          language_code: "en",
          word_count: 5,
          content_hash: "h1",
        },
        {
          id: "item-2",
          organization_id: "org-1",
          source_id: "src-1",
          source_type: "capterra",
          content_text: "Terrible customer service, slow replies.",
          rating: 1,
          author_identifier: "author-2",
          language_code: "en",
          word_count: 6,
          content_hash: "h2",
        },
      ];

      mockProvider.enqueueStructuredResponse({
        sentiment: "positive",
        sentimentScore: 0.9,
        emotion: "joy",
        intent: "praise",
        severity: "low",
        topics: ["onboarding"],
        complaintDetected: false,
        complaintSummary: null,
        customerIntent: "Praise onboarding",
        recommendedAction: "Share with team",
        conciseSummary: "Customer loved the onboarding.",
        painPoints: [],
        confidence: { sentimentConfidence: 0.9, intentConfidence: 0.9, overallConfidence: 0.9 },
        isSpam: false,
        isAmbiguous: false,
      });

      mockProvider.enqueueStructuredResponse({
        sentiment: "negative",
        sentimentScore: -0.8,
        emotion: "anger",
        intent: "complaint",
        severity: "high",
        topics: ["customer_support"],
        complaintDetected: true,
        complaintSummary: "Slow customer support replies",
        customerIntent: "Complain about support delay",
        recommendedAction: "Improve SLA response times",
        conciseSummary: "Customer complained of slow support.",
        painPoints: ["Slow support response"],
        confidence: { sentimentConfidence: 0.9, intentConfidence: 0.9, overallConfidence: 0.9 },
        isSpam: false,
        isAmbiguous: false,
      });

      const summary = await processor.processBatch(items, {
        concurrency: 2,
        persist: false,
      });

      expect(summary.total).toBe(2);
      expect(summary.completed).toBe(2);
      expect(summary.failed).toBe(0);
      expect(summary.executions).toHaveLength(2);
      expect(summary.executions[0].result?.sentiment).toBe("positive");
      expect(summary.executions[1].result?.sentiment).toBe("negative");
    });
  });
});
