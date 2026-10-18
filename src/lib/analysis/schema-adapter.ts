import { z } from "zod";
import { FeedbackAnalysisSchema, type FeedbackAnalysisResult } from "./schemas";

/**
 * Schema adapter for mapping different AI provider response formats
 * to our standardized FeedbackAnalysisSchema.
 *
 * Different models (Claude, Gemini, etc.) return analysis in different formats.
 * This adapter normalizes those responses into our canonical schema.
 */

/**
 * Gemini analysis response format (raw from API)
 */
export const GeminiAnalysisSchema = z.object({
  analysis_target: z.string().optional(),
  sentiment: z.string().optional(),
  status: z.string().optional(),
  insights: z.array(z.string()).optional(),
  recommended_actions: z.array(z.string()).optional(),
  emotion: z.string().optional(),
  intent: z.string().optional(),
  severity: z.string().optional(),
  topics: z.array(z.string()).optional(),
  complaint_summary: z.string().optional(),
  customer_intent: z.string().optional(),
  pain_points: z.array(z.string()).optional(),
  confidence_score: z.number().optional(),
  spam_score: z.number().optional(),
  // Snake_case variants from Gemini
  is_complaint: z.boolean().optional(),
  complaint_type: z.string().optional().nullable(),
  confidence_scores: z.record(z.string(), z.number()).optional(),
}).passthrough(); // Allow additional fields

export type GeminiAnalysisResponse = z.infer<typeof GeminiAnalysisSchema>;

/**
 * Maps sentiment string to our canonical sentiment enum
 */
function mapSentiment(
  geminiSentiment?: string
): "very_positive" | "positive" | "neutral" | "negative" | "very_negative" {
  if (!geminiSentiment) return "neutral";

  const lower = geminiSentiment.toLowerCase();

  if (lower.includes("very positive") || lower.includes("very_positive")) {
    return "very_positive";
  }
  if (lower.includes("positive")) {
    return "positive";
  }
  if (lower.includes("very negative") || lower.includes("very_negative")) {
    return "very_negative";
  }
  if (lower.includes("negative")) {
    return "negative";
  }

  return "neutral";
}

/**
 * Maps emotion string to our canonical emotion enum
 */
function mapEmotion(
  geminiEmotion?: string
): "joy" | "gratitude" | "delight" | "frustration" | "anger" | "confusion" | "disappointment" | "neutral" {
  if (!geminiEmotion) return "neutral";

  const lower = geminiEmotion.toLowerCase();

  const emotionMap: Record<string, "joy" | "gratitude" | "delight" | "frustration" | "anger" | "confusion" | "disappointment" | "neutral"> = {
    joy: "joy",
    happy: "joy",
    delight: "delight",
    delighted: "delight",
    gratitude: "gratitude",
    grateful: "gratitude",
    thankful: "gratitude",
    frustration: "frustration",
    frustrated: "frustration",
    annoyed: "frustration",
    anger: "anger",
    angry: "anger",
    mad: "anger",
    confusion: "confusion",
    confused: "confusion",
    disappointment: "disappointment",
    disappointed: "disappointment",
    sad: "disappointment",
  };

  for (const [key, value] of Object.entries(emotionMap)) {
    if (lower.includes(key)) return value;
  }

  return "neutral";
}

/**
 * Maps intent string to our canonical intent enum
 */
function mapIntent(
  geminiIntent?: string
): "complaint" | "praise" | "feature_request" | "bug_report" | "question" | "refund_request" | "churn_threat" | "general_feedback" {
  if (!geminiIntent) return "general_feedback";

  const lower = geminiIntent.toLowerCase();

  if (lower.includes("complaint")) return "complaint";
  if (lower.includes("praise")) return "praise";
  if (lower.includes("feature")) return "feature_request";
  if (lower.includes("bug")) return "bug_report";
  if (lower.includes("question") || lower.includes("query")) return "question";
  if (lower.includes("refund")) return "refund_request";
  if (lower.includes("churn") || lower.includes("leave")) return "churn_threat";

  // For unrecognized intents like "testing", "feedback", or other strings,
  // default to general_feedback rather than failing
  return "general_feedback";
}

/**
 * Maps severity string to our canonical severity enum
 */
function mapSeverity(
  geminiSeverity?: string
): "low" | "medium" | "high" | "critical" {
  if (!geminiSeverity) return "medium";

  const lower = geminiSeverity.toLowerCase();

  if (lower.includes("critical")) return "critical";
  if (lower.includes("high")) return "high";
  if (lower.includes("medium")) return "medium";
  if (lower.includes("low")) return "low";

  return "medium";
}

/**
 * Calculates sentiment score based on sentiment and insights
 */
function calculateSentimentScore(
  sentiment: string,
  insights?: string[]
): number {
  const sentimentMap: Record<string, number> = {
    very_positive: 1.0,
    positive: 0.5,
    neutral: 0,
    negative: -0.5,
    very_negative: -1.0,
  };

  let score = sentimentMap[sentiment] ?? 0;

  // Adjust based on insights if available
  if (insights && insights.length > 0) {
    const insightText = insights.join(" ").toLowerCase();
    if (insightText.includes("excellent") || insightText.includes("great")) score += 0.2;
    if (insightText.includes("poor") || insightText.includes("bad")) score -= 0.2;
  }

  return Math.max(-1, Math.min(1, score));
}

/**
 * Converts Gemini response to FeedbackAnalysisResult
 *
 * This adapter handles the impedance mismatch between Gemini's response format
 * and our canonical FeedbackAnalysisSchema. It maps fields, calculates missing
 * values, and ensures all required schema fields are present.
 */
export function adaptGeminiResponseToSchema(
  geminiResponse: GeminiAnalysisResponse
): FeedbackAnalysisResult {
  const sentiment = mapSentiment(geminiResponse.sentiment);
  const emotion = mapEmotion(geminiResponse.emotion);
  const intent = mapIntent(geminiResponse.intent);
  const severity = mapSeverity(geminiResponse.severity);

  const topics = geminiResponse.topics ?? [];
  const painPoints = geminiResponse.pain_points ?? [];

  // Handle is_complaint field from Gemini (snake_case boolean)
  const complaintDetected =
    geminiResponse.is_complaint === true ||
    sentiment === "negative" ||
    sentiment === "very_negative" ||
    intent === "complaint" ||
    intent === "refund_request" ||
    intent === "churn_threat";

  const complaintSummary = complaintDetected
    ? geminiResponse.complaint_summary ||
      geminiResponse.insights?.[0] ||
      "Customer complaint detected"
    : null;

  const customerIntent =
    geminiResponse.customer_intent ||
    geminiResponse.insights?.[0] ||
    "Analysis from customer feedback";

  const recommendedAction =
    geminiResponse.recommended_actions?.[0] ||
    "Follow up with customer to understand concerns better";

  const conciseSummary =
    geminiResponse.analysis_target ||
    geminiResponse.insights?.join("; ") ||
    "Customer feedback analyzed";

  const sentimentScore = calculateSentimentScore(sentiment, geminiResponse.insights);

  // Extract confidence scores from Gemini response
  // Gemini may provide: confidence_scores (flat object) or confidence_score (single number)
  let sentimentConfidence = 0.8;
  let intentConfidence = 0.8;
  let overallConfidence = 0.8;

  if (geminiResponse.confidence_scores && typeof geminiResponse.confidence_scores === "object") {
    // confidence_scores is a flat object like { sentiment: 0.9, intent: 0.85, ... }
    const scores = geminiResponse.confidence_scores as Record<string, any>;
    sentimentConfidence = Number(scores.sentiment) || sentimentConfidence;
    intentConfidence = Number(scores.intent) || intentConfidence;
    overallConfidence = Number(scores.overall) || overallConfidence;
  } else if (typeof geminiResponse.confidence_score === "number") {
    // Single confidence_score applies to all
    overallConfidence = geminiResponse.confidence_score;
  }

  // Clamp all scores to [0, 1]
  sentimentConfidence = Math.min(1, Math.max(0, sentimentConfidence));
  intentConfidence = Math.min(1, Math.max(0, intentConfidence));
  overallConfidence = Math.min(1, Math.max(0, overallConfidence));

  const result: FeedbackAnalysisResult = {
    sentiment,
    sentimentScore,
    emotion,
    intent,
    severity,
    topics: topics.slice(0, 8), // Max 8 topics
    complaintDetected,
    complaintSummary,
    customerIntent: customerIntent.substring(0, 300), // Max 300 chars
    recommendedAction: recommendedAction.substring(0, 500), // Max 500 chars
    conciseSummary: conciseSummary.substring(0, 300), // Max 300 chars
    painPoints: painPoints.slice(0, 5), // Max 5 pain points
    confidence: {
      sentimentConfidence,
      intentConfidence,
      overallConfidence,
    },
    isSpam: false, // Gemini doesn't provide spam detection in basic response
    isAmbiguous: !geminiResponse.sentiment || geminiResponse.sentiment === "neutral",
  };

  // Validate against schema
  const validation = FeedbackAnalysisSchema.safeParse(result);
  if (!validation.success) {
    throw new Error(
      `Adapted Gemini response failed schema validation: ${JSON.stringify(validation.error.issues)}`
    );
  }

  return result;
}

/**
 * Attempts to extract structured data from unstructured Gemini text response
 *
 * Used as fallback when Gemini returns plain text instead of JSON
 */
export function extractStructuredFromGeminiText(text: string): FeedbackAnalysisResult {
  const lower = text.toLowerCase();

  // Detect sentiment from keywords
  let sentiment: "very_positive" | "positive" | "neutral" | "negative" | "very_negative" = "neutral";
  if (lower.includes("excellent") || lower.includes("amazing")) sentiment = "very_positive";
  else if (lower.includes("good") || lower.includes("great")) sentiment = "positive";
  else if (lower.includes("bad") || lower.includes("terrible")) sentiment = "very_negative";
  else if (lower.includes("poor") || lower.includes("disappointing")) sentiment = "negative";

  // Detect intent from keywords
  let intent: "complaint" | "praise" | "feature_request" | "bug_report" | "question" | "refund_request" | "churn_threat" | "general_feedback" = "general_feedback";
  if (lower.includes("bug") || lower.includes("broken")) intent = "bug_report";
  else if (lower.includes("feature") || lower.includes("request")) intent = "feature_request";
  else if (lower.includes("complaint") || lower.includes("issue")) intent = "complaint";
  else if (lower.includes("refund")) intent = "refund_request";
  else if (lower.includes("excellent") || lower.includes("love")) intent = "praise";

  return {
    sentiment,
    sentimentScore: sentiment === "very_positive" ? 1 : sentiment === "positive" ? 0.5 : sentiment === "very_negative" ? -1 : sentiment === "negative" ? -0.5 : 0,
    emotion: mapEmotion(text),
    intent,
    severity: "medium",
    topics: [],
    complaintDetected: sentiment === "negative" || sentiment === "very_negative" || intent === "complaint",
    complaintSummary: null,
    customerIntent: text.substring(0, 300),
    recommendedAction: "Follow up with customer",
    conciseSummary: text.substring(0, 300),
    painPoints: [],
    confidence: {
      sentimentConfidence: 0.5,
      intentConfidence: 0.5,
      overallConfidence: 0.5,
    },
    isSpam: false,
    isAmbiguous: true,
  };
}
