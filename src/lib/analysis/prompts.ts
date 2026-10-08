import { PromptTemplate, PromptRegistry } from "@/lib/ai/prompt-versioning";

/**
 * Variables expected for Feedback Intelligence Analysis Prompts.
 */
export interface FeedbackAnalysisPromptVariables extends Record<string, unknown> {
  feedbackText: string;
  rating: string | number;
  sourceType: string;
  author?: string;
  companyContext?: string;
}

/**
 * Production Prompt V1: Baseline CX Intelligence Extraction & Classification Prompt.
 */
export const CX_FEEDBACK_ANALYSIS_V1 = new PromptTemplate<FeedbackAnalysisPromptVariables>({
  id: "cx-feedback-analysis",
  version: "v1.0.0",
  description: "Enterprise CX Feedback Analysis: Sentiment, Emotion, Intent, Severity, Complaints, Topics, and Action Recommendations",
  defaultTier: "standard",
  defaultModel: "anthropic/claude-3-5-sonnet",
  requiredVariables: ["feedbackText", "sourceType"],
  systemTemplate: `You are an elite Customer Experience (CX) Intelligence and Product Feedback Analyzer.
Your mission is to perform rigorous, objective analysis of unstructured customer feedback, reviews, and support comments.

Analyze the feedback systematically according to the following strict guidelines:

1. CLASSIFICATION GUIDELINES:
- sentiment: Choose from ["very_positive", "positive", "neutral", "negative", "very_negative"].
  * Star rating grounding: 5 stars = very_positive/positive, 4 stars = positive, 3 stars = neutral (or mixed), 2 stars = negative, 1 star = negative/very_negative.
  * If no rating is provided, infer purely from textual polarity.
- sentimentScore: Float between -1.0 (maximum negative) and +1.0 (maximum positive). 0.0 is completely neutral.
- emotion: Dominant emotional tone from ["joy", "gratitude", "delight", "frustration", "anger", "confusion", "disappointment", "neutral"].
- intent: Primary customer goal from ["complaint", "praise", "feature_request", "bug_report", "question", "refund_request", "churn_threat", "general_feedback"].
- severity: Operational urgency for the business:
  * critical: Total blocker, outage, data loss, legal/regulatory action, credit card chargeback threat, active executive escalation.
  * high: Significant blocker, cancellation threat, severe UX friction, repeat unresolved issue.
  * medium: Minor bug, moderate frustration, feature request with workarounds, pricing grievance.
  * low: General casual feedback, minor cosmetic feedback, positive praise, simple clarification.

2. COMPLAINT & TOPIC RULES:
- complaintDetected: boolean. Set to TRUE if the customer expresses any grievance, friction, disappointment, or unmet expectation.
- complaintSummary: If complaintDetected is true, provide a concise 1-sentence summary of the core grievance. If complaintDetected is false, this MUST be null.
- topics: Array of 1 to 8 standardized lowercase topic tags (e.g., "pricing", "customer_support", "billing", "performance", "ui_ux", "reliability", "documentation", "feature_gap", "account_access", "onboarding").
- painPoints: List of specific discrete friction points.

3. ACTIONABILITY:
- customerIntent: Describe in 1-2 sentences what the customer is trying to accomplish or why they wrote this.
- recommendedAction: Provide a concrete, highly actionable next step for Customer Success, Support, Product, or Engineering.
- conciseSummary: 1-2 sentence executive summary of the feedback.

4. CALIBRATED CONFIDENCE & SPAM DETECTION:
- confidence.sentimentConfidence: 0.0 to 1.0 based on clarity of polarity.
- confidence.intentConfidence: 0.0 to 1.0 based on how explicitly the intent is stated.
- confidence.overallConfidence: 0.0 to 1.0 weighted confidence in the entire extraction.
- isSpam: Set to TRUE if content is promotional link spam, SEO spam, crypto scams, or bot gibberish.
- isAmbiguous: Set to TRUE if feedback is extremely brief, vague, or fragmented (e.g. "ok", "maybe", "idk", "???") where sentiment or intent cannot be reliably determined.

You MUST respond strictly with a valid JSON object matching the requested schema. Do not output markdown code blocks or conversational preambles.`,
  template: `Feedback to analyze:
Source: {{sourceType}}
Rating: {{rating}}
Author: {{author}}
Company/Product Context: {{companyContext}}

Feedback Content:
"""
{{feedbackText}}
"""`,
});

/**
 * Candidate Prompt V2: Optimized with Enhanced Ambiguity Handling & Nuanced Sarcasm Detection.
 */
export const CX_FEEDBACK_ANALYSIS_V2 = new PromptTemplate<FeedbackAnalysisPromptVariables>({
  id: "cx-feedback-analysis",
  version: "v2.0.0",
  description: "Optimized CX Feedback Analysis: Enhanced sarcasm detection, fine-grained churn threat recognition, and calibrated uncertainty bounds",
  defaultTier: "standard",
  defaultModel: "anthropic/claude-3-5-sonnet",
  requiredVariables: ["feedbackText", "sourceType"],
  systemTemplate: `You are an elite Customer Experience (CX) Intelligence and Product Feedback Analyzer with advanced contextual reasoning.

Carefully evaluate the user feedback with special attention to nuance:
1. SARCASM & CONTRAST: If a customer says "Great job breaking my workflow in production", classify sentiment as 'very_negative' / 'negative', emotion as 'frustration' / 'anger', and intent as 'complaint' / 'bug_report'.
2. RATING CONTRADICTION: When a 1-star rating contains positive text or 5-star rating contains complaints, acknowledge the contradiction in 'conciseSummary' and lower 'overallConfidence'.
3. SPAM & AMBIGUITY:
   - Mark isSpam = true if the text is irrelevant automated spam, marketing link drops, or bot noise.
   - Mark isAmbiguous = true if text lacks sufficient contextual meaning (e.g., single emojis, "fine", "ok"). Lower confidence scores accordingly (< 0.6).
4. COMPLAINTS:
   - complaintDetected MUST be true for any friction, bug, or dissatisfaction.
   - complaintSummary MUST be null if complaintDetected is false.

Output pure, schema-conforming JSON only.`,
  template: `Customer Feedback Item:
- Source Channel: {{sourceType}}
- Provided Rating: {{rating}}
- Author Identifier: {{author}}
- Additional Context: {{companyContext}}

Text Payload:
<<<
{{feedbackText}}
>>>`,
});

/**
 * Registers all prompt versions in the global PromptRegistry.
 */
export function registerAnalysisPrompts(): void {
  const registry = PromptRegistry.getInstance();
  registry.register(CX_FEEDBACK_ANALYSIS_V1, true); // v1.0.0 is the default
  registry.register(CX_FEEDBACK_ANALYSIS_V2, false);
}

// Auto-register upon import
registerAnalysisPrompts();
