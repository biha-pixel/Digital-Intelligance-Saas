import { z } from "zod";

/**
 * Standard sentiment taxonomy for CX intelligence.
 */
export const SentimentEnum = z.enum([
  "very_positive",
  "positive",
  "neutral",
  "negative",
  "very_negative",
]);
export type Sentiment = z.infer<typeof SentimentEnum>;

/**
 * Granular emotional state taxonomy.
 */
export const EmotionEnum = z.enum([
  "joy",
  "gratitude",
  "delight",
  "frustration",
  "anger",
  "confusion",
  "disappointment",
  "neutral",
]);
export type Emotion = z.infer<typeof EmotionEnum>;

/**
 * Primary customer intent taxonomy.
 */
export const IntentEnum = z.enum([
  "complaint",
  "praise",
  "feature_request",
  "bug_report",
  "question",
  "refund_request",
  "churn_threat",
  "general_feedback",
]);
export type Intent = z.infer<typeof IntentEnum>;

/**
 * Business urgency and operational impact severity level.
 */
export const SeverityEnum = z.enum(["low", "medium", "high", "critical"]);
export type Severity = z.infer<typeof SeverityEnum>;

/**
 * Confidence calibration scores across core classifications.
 */
export const AnalysisConfidenceSchema = z.object({
  sentimentConfidence: z
    .number()
    .min(0, "Sentiment confidence must be >= 0")
    .max(1, "Sentiment confidence must be <= 1")
    .describe("Confidence score for sentiment classification (0.0 to 1.0)"),
  intentConfidence: z
    .number()
    .min(0, "Intent confidence must be >= 0")
    .max(1, "Intent confidence must be <= 1")
    .describe("Confidence score for primary intent classification (0.0 to 1.0)"),
  overallConfidence: z
    .number()
    .min(0, "Overall confidence must be >= 0")
    .max(1, "Overall confidence must be <= 1")
    .describe("Weighted overall confidence in the entire extraction (0.0 to 1.0)"),
});
export type AnalysisConfidence = z.infer<typeof AnalysisConfidenceSchema>;

/**
 * Authoritative Zod schema for structured Feedback Intelligence extraction.
 * Guarantees schema adherence, range checks, and type coercion.
 */
export const FeedbackAnalysisSchema = z.object({
  sentiment: SentimentEnum.describe(
    "Overall sentiment classification of the feedback item."
  ),
  sentimentScore: z
    .number()
    .min(-1, "Sentiment score cannot be below -1.0")
    .max(1, "Sentiment score cannot exceed 1.0")
    .describe(
      "Numeric sentiment polarity score from -1.0 (extremely negative) to +1.0 (extremely positive), with 0.0 being neutral."
    ),
  emotion: EmotionEnum.describe(
    "Primary emotional state expressed by the customer."
  ),
  intent: IntentEnum.describe(
    "Primary driving intent or purpose behind the customer's feedback."
  ),
  severity: SeverityEnum.describe(
    "Operational severity or urgency level: critical (outage, data loss, legal/chargeback threat), high (severe blocker, cancellation threat), medium (general bug, moderate dissatisfaction), low (minor suggestion, casual praise, cosmetic issue)."
  ),
  topics: z
    .array(z.string().min(1).max(50))
    .min(1, "At least one topic tag must be identified")
    .max(8, "No more than 8 topic tags allowed")
    .describe(
      "Specific operational topics discussed (e.g., 'pricing', 'customer_support', 'billing', 'performance', 'ui_ux', 'reliability', 'documentation', 'mobile_app', 'delivery')."
    ),
  complaintDetected: z
    .boolean()
    .describe(
      "True if the customer is expressing a grievance, dissatisfaction, failure of expectation, or product/service defect."
    ),
  complaintSummary: z
    .string()
    .nullable()
    .describe(
      "Clear, concise 1-sentence summary of the specific complaint if complaintDetected is true. Must be null if complaintDetected is false."
    ),
  customerIntent: z
    .string()
    .min(5, "Customer intent description must be meaningful")
    .max(300, "Customer intent summary must be concise")
    .describe(
      "Detailed description of what the customer is trying to accomplish or why they wrote this feedback."
    ),
  recommendedAction: z
    .string()
    .min(10, "Recommended action must be actionable")
    .max(500, "Recommended action must remain concise")
    .describe(
      "Concrete, actionable recommendation for CX, Customer Success, Product, or Engineering teams to resolve the issue or capitalize on praise."
    ),
  conciseSummary: z
    .string()
    .min(10, "Summary must be at least 10 characters")
    .max(300, "Summary must be under 300 characters")
    .describe(
      "Executive summary of the feedback in 1-2 clear, informative sentences."
    ),
  painPoints: z
    .array(z.string().min(2).max(150))
    .max(5, "Maximum 5 pain points")
    .describe(
      "List of specific frictions, blockers, or pain points mentioned (empty array if none)."
    ),
  confidence: AnalysisConfidenceSchema.describe(
    "Calibrated confidence scores for this feedback analysis."
  ),
  isSpam: z
    .boolean()
    .describe(
      "True if the content appears to be automated bot spam, promotional link drop, crypto solicitation, or non-human gibberish."
    ),
  isAmbiguous: z
    .boolean()
    .describe(
      "True if the feedback is too brief, vague, or fragmented to determine clear sentiment or intent with high confidence (e.g. 'ok', 'maybe', '???')."
    ),
});

export type FeedbackAnalysisResult = z.infer<typeof FeedbackAnalysisSchema>;
