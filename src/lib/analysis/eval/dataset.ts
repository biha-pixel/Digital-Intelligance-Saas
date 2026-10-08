import { Sentiment, Emotion, Intent, Severity } from "../schemas";

export interface GoldenEvaluationItem {
  id: string;
  category:
    | "positive"
    | "negative"
    | "neutral"
    | "angry"
    | "confused"
    | "refund_request"
    | "feature_request"
    | "product_complaint"
    | "service_complaint"
    | "spam"
    | "ambiguous";
  sourceType: string;
  rating?: number;
  author?: string;
  feedbackText: string;
  expected: {
    sentiment: Sentiment | Sentiment[];
    sentimentScoreRange: [number, number]; // [min, max]
    emotion: Emotion | Emotion[];
    intent: Intent | Intent[];
    severity: Severity | Severity[];
    complaintDetected: boolean;
    isSpam: boolean;
    isAmbiguous: boolean;
    expectedTopics: string[];
  };
}

/**
 * Curated Gold-Standard Evaluation Dataset (35 Ground-Truth CX Feedback Items).
 * Covers 11 distinct customer interaction archetypes with calibrated bounds.
 */
export const GOLDEN_EVALUATION_DATASET: GoldenEvaluationItem[] = [
  // -------------------------------------------------------------
  // 1. POSITIVE (Delight, Praise, Brand Advocates)
  // -------------------------------------------------------------
  {
    id: "eval-pos-001",
    category: "positive",
    sourceType: "trustpilot",
    rating: 5,
    author: "Sarah Jenkins",
    feedbackText:
      "Absolutely phenomenal software! The automated reporting saved our team at least 15 hours every week. Customer support was also incredibly responsive when onboarding our 50-seat team.",
    expected: {
      sentiment: ["positive", "very_positive"],
      sentimentScoreRange: [0.6, 1.0],
      emotion: ["joy", "gratitude", "delight"],
      intent: ["praise", "general_feedback"],
      severity: ["low"],
      complaintDetected: false,
      isSpam: false,
      isAmbiguous: false,
      expectedTopics: ["customer_support", "onboarding", "performance", "ui_ux"],
    },
  },
  {
    id: "eval-pos-002",
    category: "positive",
    sourceType: "g2",
    rating: 5,
    author: "Alex Rivera",
    feedbackText:
      "The new analytics dashboard in version 4 is a game changer. Super clean interface, lightning-fast queries, and seamless export to BigQuery.",
    expected: {
      sentiment: ["positive", "very_positive"],
      sentimentScoreRange: [0.5, 1.0],
      emotion: ["delight", "joy"],
      intent: ["praise", "general_feedback"],
      severity: ["low"],
      complaintDetected: false,
      isSpam: false,
      isAmbiguous: false,
      expectedTopics: ["performance", "ui_ux", "analytics", "integrations"],
    },
  },
  {
    id: "eval-pos-003",
    category: "positive",
    sourceType: "capterra",
    rating: 4,
    author: "Elena Rostova",
    feedbackText:
      "Overall really happy with the tool. Easy to set up and great value for the price compared to Enterprise competitors.",
    expected: {
      sentiment: ["positive"],
      sentimentScoreRange: [0.3, 0.8],
      emotion: ["delight", "gratitude", "neutral"],
      intent: ["praise", "general_feedback"],
      severity: ["low"],
      complaintDetected: false,
      isSpam: false,
      isAmbiguous: false,
      expectedTopics: ["pricing", "onboarding", "product_value"],
    },
  },

  // -------------------------------------------------------------
  // 2. NEGATIVE (Dissatisfaction, Subpar Quality)
  // -------------------------------------------------------------
  {
    id: "eval-neg-001",
    category: "negative",
    sourceType: "trustpilot",
    rating: 2,
    author: "David Vance",
    feedbackText:
      "The product was decent when we started last year, but recent updates have made the UI sluggish and unintuitive. Basic navigation now takes three extra clicks.",
    expected: {
      sentiment: ["negative"],
      sentimentScoreRange: [-0.8, -0.2],
      emotion: ["disappointment", "frustration"],
      intent: ["complaint"],
      severity: ["medium"],
      complaintDetected: true,
      isSpam: false,
      isAmbiguous: false,
      expectedTopics: ["ui_ux", "performance", "updates"],
    },
  },
  {
    id: "eval-neg-002",
    category: "negative",
    sourceType: "google_maps",
    rating: 1,
    author: "Karen Phillips",
    feedbackText:
      "Terrible experience. The system crashed twice while preparing an executive report. Lost two hours of unsaved work.",
    expected: {
      sentiment: ["negative", "very_negative"],
      sentimentScoreRange: [-1.0, -0.5],
      emotion: ["frustration", "anger", "disappointment"],
      intent: ["complaint", "bug_report"],
      severity: ["high", "critical"],
      complaintDetected: true,
      isSpam: false,
      isAmbiguous: false,
      expectedTopics: ["reliability", "data_loss", "performance"],
    },
  },
  {
    id: "eval-neg-003",
    category: "negative",
    sourceType: "yelp",
    rating: 2,
    author: "Marcus Brody",
    feedbackText:
      "Disappointed with the lack of progress on critical bugs. We've reported CSV parsing issues multiple times over three months without a fix.",
    expected: {
      sentiment: ["negative"],
      sentimentScoreRange: [-0.9, -0.3],
      emotion: ["disappointment", "frustration"],
      intent: ["complaint", "bug_report"],
      severity: ["medium", "high"],
      complaintDetected: true,
      isSpam: false,
      isAmbiguous: false,
      expectedTopics: ["reliability", "customer_support", "bug_fix"],
    },
  },

  // -------------------------------------------------------------
  // 3. NEUTRAL (Informational, Balanced)
  // -------------------------------------------------------------
  {
    id: "eval-neu-001",
    category: "neutral",
    sourceType: "reddit",
    rating: 3,
    author: "tech_observer_99",
    feedbackText:
      "Does the job for basic scraping tasks. It is neither particularly fast nor slow compared to Puppeteer or Playwright. Standard pricing for this tier.",
    expected: {
      sentiment: ["neutral"],
      sentimentScoreRange: [-0.2, 0.2],
      emotion: ["neutral"],
      intent: ["general_feedback"],
      severity: ["low"],
      complaintDetected: false,
      isSpam: false,
      isAmbiguous: false,
      expectedTopics: ["pricing", "performance", "comparison"],
    },
  },
  {
    id: "eval-neu-002",
    category: "neutral",
    sourceType: "survey",
    rating: 3,
    author: "Anonymous User",
    feedbackText:
      "We use this primarily for monthly data extraction. The documentation is sufficient for standard setups. Average tool.",
    expected: {
      sentiment: ["neutral"],
      sentimentScoreRange: [-0.2, 0.2],
      emotion: ["neutral"],
      intent: ["general_feedback"],
      severity: ["low"],
      complaintDetected: false,
      isSpam: false,
      isAmbiguous: false,
      expectedTopics: ["documentation", "usage"],
    },
  },
  {
    id: "eval-neu-003",
    category: "neutral",
    sourceType: "g2",
    rating: 3,
    author: "Jordan Smith",
    feedbackText:
      "Good charting capabilities, but the export formats are somewhat limited. Okay for small marketing teams.",
    expected: {
      sentiment: ["neutral", "positive"],
      sentimentScoreRange: [-0.1, 0.3],
      emotion: ["neutral"],
      intent: ["general_feedback", "feature_request"],
      severity: ["low"],
      complaintDetected: false,
      isSpam: false,
      isAmbiguous: false,
      expectedTopics: ["ui_ux", "export", "features"],
    },
  },

  // -------------------------------------------------------------
  // 4. ANGRY (Outrage, Churn Threats, Executive Escalation)
  // -------------------------------------------------------------
  {
    id: "eval-ang-001",
    category: "angry",
    sourceType: "support_ticket",
    rating: 1,
    author: "Robert Chen (VP Eng)",
    feedbackText:
      "This is unacceptable! Your database outage took our primary production pipeline down for 6 hours during peak Black Friday traffic. If we don't get an immediate executive RCA and SLA credit, our legal counsel will pursue breach of contract.",
    expected: {
      sentiment: ["very_negative"],
      sentimentScoreRange: [-1.0, -0.7],
      emotion: ["anger", "frustration"],
      intent: ["churn_threat", "complaint"],
      severity: ["critical"],
      complaintDetected: true,
      isSpam: false,
      isAmbiguous: false,
      expectedTopics: ["reliability", "outage", "sla", "legal", "churn"],
    },
  },
  {
    id: "eval-ang-002",
    category: "angry",
    sourceType: "trustpilot",
    rating: 1,
    author: "Samantha Bell",
    feedbackText:
      "Complete scam company! You charged my credit card twice after I explicitly cancelled my trial last Tuesday. Nobody replies on your live chat. I am issuing a chargeback with Chase Bank right now!",
    expected: {
      sentiment: ["very_negative"],
      sentimentScoreRange: [-1.0, -0.7],
      emotion: ["anger", "frustration"],
      intent: ["complaint", "refund_request", "churn_threat"],
      severity: ["critical", "high"],
      complaintDetected: true,
      isSpam: false,
      isAmbiguous: false,
      expectedTopics: ["billing", "chargeback", "customer_support", "cancellation"],
    },
  },
  {
    id: "eval-ang-003",
    category: "angry",
    sourceType: "twitter",
    author: "DevOpsDan",
    feedbackText:
      "Worst platform upgrade I've ever experienced in 15 years of engineering. Silent schema breakage, zero rollback support, and complete radio silence from status page. Switching our entire cluster to AWS tomorrow.",
    expected: {
      sentiment: ["very_negative"],
      sentimentScoreRange: [-1.0, -0.8],
      emotion: ["anger", "frustration"],
      intent: ["churn_threat", "complaint"],
      severity: ["critical", "high"],
      complaintDetected: true,
      isSpam: false,
      isAmbiguous: false,
      expectedTopics: ["reliability", "churn", "status_page", "migration"],
    },
  },

  // -------------------------------------------------------------
  // 5. CONFUSED (UX Friction, Ambiguous Workflows)
  // -------------------------------------------------------------
  {
    id: "eval-cnf-001",
    category: "confused",
    sourceType: "zendesk",
    rating: 2,
    author: "Emily White",
    feedbackText:
      "I'm really confused by the new billing screen. What is the difference between 'Compute Credits' and 'Execution Tokens'? Why did my bill jump 30% when my user count stayed exactly the same?",
    expected: {
      sentiment: ["neutral", "negative"],
      sentimentScoreRange: [-0.6, 0.0],
      emotion: ["confusion", "frustration"],
      intent: ["question", "complaint"],
      severity: ["medium"],
      complaintDetected: true,
      isSpam: false,
      isAmbiguous: false,
      expectedTopics: ["billing", "pricing", "ui_ux", "clarification"],
    },
  },
  {
    id: "eval-cnf-002",
    category: "confused",
    sourceType: "app_store",
    rating: 3,
    author: "m_turner",
    feedbackText:
      "How do I export my feedback data to CSV? The settings menu shows 'Export' but clicking it opens a blank screen with a spinning loader. Is this a permission issue or a bug?",
    expected: {
      sentiment: ["neutral", "negative"],
      sentimentScoreRange: [-0.5, 0.1],
      emotion: ["confusion"],
      intent: ["question", "bug_report"],
      severity: ["low", "medium"],
      complaintDetected: true,
      isSpam: false,
      isAmbiguous: false,
      expectedTopics: ["export", "ui_ux", "bug_report", "permissions"],
    },
  },
  {
    id: "eval-cnf-003",
    category: "confused",
    sourceType: "discourse_forum",
    author: "karl_b",
    feedbackText:
      "I followed the documentation for webhook signature verification step by step, but my HMAC validation fails on every request. Are the headers timestamp-prefixed or raw payload hashes?",
    expected: {
      sentiment: ["neutral", "negative"],
      sentimentScoreRange: [-0.4, 0.1],
      emotion: ["confusion", "neutral"],
      intent: ["question", "feature_request"],
      severity: ["low", "medium"],
      complaintDetected: false,
      isSpam: false,
      isAmbiguous: false,
      expectedTopics: ["documentation", "webhooks", "api", "security"],
    },
  },

  // -------------------------------------------------------------
  // 6. REFUND REQUESTS (Billing Disputes, Accidental Charges)
  // -------------------------------------------------------------
  {
    id: "eval-ref-001",
    category: "refund_request",
    sourceType: "support_email",
    author: "Lisa Montgomery",
    feedbackText:
      "Hello, my annual subscription automatically renewed yesterday without any prior reminder email. I have not used the service in 5 months. Please cancel my account immediately and refund the $1,200 charge back to my Visa.",
    expected: {
      sentiment: ["negative", "neutral"],
      sentimentScoreRange: [-0.7, 0.0],
      emotion: ["frustration", "neutral", "disappointment"],
      intent: ["refund_request"],
      severity: ["high", "medium"],
      complaintDetected: true,
      isSpam: false,
      isAmbiguous: false,
      expectedTopics: ["billing", "refund", "subscription", "cancellation"],
    },
  },
  {
    id: "eval-ref-002",
    category: "refund_request",
    sourceType: "intercom",
    author: "Carlos Mendez",
    feedbackText:
      "We accidentally purchased 10 Enterprise licenses instead of 2 due to a dropdown glitch on the checkout page. Need a refund for the 8 extra seats right away.",
    expected: {
      sentiment: ["neutral", "negative"],
      sentimentScoreRange: [-0.5, 0.0],
      emotion: ["neutral", "frustration"],
      intent: ["refund_request"],
      severity: ["high", "medium"],
      complaintDetected: true,
      isSpam: false,
      isAmbiguous: false,
      expectedTopics: ["billing", "checkout", "refund", "licensing"],
    },
  },
  {
    id: "eval-ref-003",
    category: "refund_request",
    sourceType: "billing_portal",
    author: "Zoe Adams",
    feedbackText:
      "Your service did not deliver the promised uptime SLA (99.9%). As per Section 4.2 of our agreement, we request a 50% refund credit for the month of September.",
    expected: {
      sentiment: ["negative", "neutral"],
      sentimentScoreRange: [-0.7, -0.1],
      emotion: ["disappointment", "neutral", "frustration"],
      intent: ["refund_request", "complaint"],
      severity: ["high", "medium"],
      complaintDetected: true,
      isSpam: false,
      isAmbiguous: false,
      expectedTopics: ["billing", "sla", "refund", "reliability"],
    },
  },

  // -------------------------------------------------------------
  // 7. FEATURE REQUESTS (Integrations, Capabilities, Dark Mode)
  // -------------------------------------------------------------
  {
    id: "eval-ftr-001",
    category: "feature_request",
    sourceType: "product_portal",
    rating: 4,
    author: "Greg Taylor",
    feedbackText:
      "Would love to see native bi-directional integration with HubSpot and Slack. Currently we have to write custom Zapier webhooks for every alert.",
    expected: {
      sentiment: ["positive", "neutral"],
      sentimentScoreRange: [0.1, 0.6],
      emotion: ["neutral", "joy", "delight"],
      intent: ["feature_request"],
      severity: ["low"],
      complaintDetected: false,
      isSpam: false,
      isAmbiguous: false,
      expectedTopics: ["integrations", "slack", "hubspot", "webhooks"],
    },
  },
  {
    id: "eval-ftr-002",
    category: "feature_request",
    sourceType: "reddit",
    author: "darkmode_enthusiast",
    feedbackText:
      "Please add Dark Mode support to the customer analytics portal! Staring at the bright white tables all day during night shifts is blinding.",
    expected: {
      sentiment: ["neutral", "positive"],
      sentimentScoreRange: [-0.1, 0.4],
      emotion: ["neutral", "delight"],
      intent: ["feature_request"],
      severity: ["low"],
      complaintDetected: false,
      isSpam: false,
      isAmbiguous: false,
      expectedTopics: ["ui_ux", "dark_mode", "accessibility"],
    },
  },
  {
    id: "eval-ftr-003",
    category: "feature_request",
    sourceType: "github_issue",
    author: "lead_architect",
    feedbackText:
      "Feature proposal: Add support for custom Webhook signing keys and mTLS for enterprise audit log export streams.",
    expected: {
      sentiment: ["neutral"],
      sentimentScoreRange: [0.0, 0.3],
      emotion: ["neutral"],
      intent: ["feature_request"],
      severity: ["low"],
      complaintDetected: false,
      isSpam: false,
      isAmbiguous: false,
      expectedTopics: ["security", "webhooks", "enterprise", "api"],
    },
  },

  // -------------------------------------------------------------
  // 8. PRODUCT COMPLAINTS (Bugs, Latency, Data Loss)
  // -------------------------------------------------------------
  {
    id: "eval-prd-001",
    category: "product_complaint",
    sourceType: "trustpilot",
    rating: 1,
    author: "Simon Green",
    feedbackText:
      "The CSV import feature is totally broken. Every time we upload files with over 5,000 rows, it throws a 504 Gateway Timeout error and leaves half the records in a corrupted state.",
    expected: {
      sentiment: ["negative", "very_negative"],
      sentimentScoreRange: [-0.9, -0.4],
      emotion: ["frustration", "anger"],
      intent: ["bug_report", "complaint"],
      severity: ["high", "critical"],
      complaintDetected: true,
      isSpam: false,
      isAmbiguous: false,
      expectedTopics: ["performance", "reliability", "csv_import", "bug_report"],
    },
  },
  {
    id: "eval-prd-002",
    category: "product_complaint",
    sourceType: "support_ticket",
    rating: 1,
    author: "Alice Cooper",
    feedbackText:
      "Search indexing has stopped updating since yesterday morning. New customer feedback items are not appearing in our filtered views or real-time alerts.",
    expected: {
      sentiment: ["negative"],
      sentimentScoreRange: [-0.8, -0.3],
      emotion: ["frustration", "disappointment"],
      intent: ["bug_report", "complaint"],
      severity: ["high"],
      complaintDetected: true,
      isSpam: false,
      isAmbiguous: false,
      expectedTopics: ["reliability", "search", "alerts", "bug_report"],
    },
  },
  {
    id: "eval-prd-003",
    category: "product_complaint",
    sourceType: "g2",
    rating: 2,
    author: "Tim Duncan",
    feedbackText:
      "The mobile responsive view is basically unusable on iPhone screens. Tables overflow horizontally and the filter button is completely unclickable.",
    expected: {
      sentiment: ["negative"],
      sentimentScoreRange: [-0.8, -0.2],
      emotion: ["frustration", "disappointment"],
      intent: ["complaint", "bug_report"],
      severity: ["medium"],
      complaintDetected: true,
      isSpam: false,
      isAmbiguous: false,
      expectedTopics: ["ui_ux", "mobile", "responsive_design"],
    },
  },

  // -------------------------------------------------------------
  // 9. SERVICE COMPLAINTS (Support Responsiveness, Staff Behavior)
  // -------------------------------------------------------------
  {
    id: "eval-srv-001",
    category: "service_complaint",
    sourceType: "trustpilot",
    rating: 1,
    author: "Patricia Moore",
    feedbackText:
      "Customer support took 4 business days to reply to an urgent ticket regarding data export. When they finally replied, they sent an automated canned response that didn't even address my question.",
    expected: {
      sentiment: ["very_negative", "negative"],
      sentimentScoreRange: [-1.0, -0.5],
      emotion: ["anger", "frustration", "disappointment"],
      intent: ["complaint"],
      severity: ["high", "medium"],
      complaintDetected: true,
      isSpam: false,
      isAmbiguous: false,
      expectedTopics: ["customer_support", "response_time", "service_quality"],
    },
  },
  {
    id: "eval-srv-002",
    category: "service_complaint",
    sourceType: "google_maps",
    rating: 1,
    author: "Brian Cox",
    feedbackText:
      "The sales rep was extremely pushy during the renewal call and refused to honor our grandfathered contract terms. Very unprofessional account management.",
    expected: {
      sentiment: ["negative", "very_negative"],
      sentimentScoreRange: [-0.9, -0.4],
      emotion: ["anger", "frustration"],
      intent: ["complaint", "churn_threat"],
      severity: ["medium", "high"],
      complaintDetected: true,
      isSpam: false,
      isAmbiguous: false,
      expectedTopics: ["account_management", "sales", "pricing", "contract"],
    },
  },
  {
    id: "eval-srv-003",
    category: "service_complaint",
    sourceType: "capterra",
    rating: 2,
    author: "Heather Locklear",
    feedbackText:
      "Support agents seem untrained on their own API. Spent two weeks going back and forth just to get a working CORS configuration sample.",
    expected: {
      sentiment: ["negative"],
      sentimentScoreRange: [-0.8, -0.3],
      emotion: ["frustration", "disappointment"],
      intent: ["complaint"],
      severity: ["medium"],
      complaintDetected: true,
      isSpam: false,
      isAmbiguous: false,
      expectedTopics: ["customer_support", "documentation", "api"],
    },
  },

  // -------------------------------------------------------------
  // 10. SPAM / IRRELEVANT BOT CONTENT
  // -------------------------------------------------------------
  {
    id: "eval-spm-001",
    category: "spam",
    sourceType: "blog_comment",
    feedbackText:
      "Earn $5000 daily working from home! Click here for free crypto casino bonuses: https://scam-crypto-link.xyz/bonus?ref=bot9912",
    expected: {
      sentiment: ["neutral", "positive"],
      sentimentScoreRange: [-0.5, 0.5],
      emotion: ["neutral"],
      intent: ["general_feedback"],
      severity: ["low"],
      complaintDetected: false,
      isSpam: true,
      isAmbiguous: false,
      expectedTopics: ["spam", "promotional"],
    },
  },
  {
    id: "eval-spm-002",
    category: "spam",
    sourceType: "trustpilot",
    feedbackText:
      "Cheap replica watches rolex gucci discount 80% off free shipping worldwide http://cheap-luxury-watches.top/store",
    expected: {
      sentiment: ["neutral", "positive"],
      sentimentScoreRange: [-0.5, 0.5],
      emotion: ["neutral"],
      intent: ["general_feedback"],
      severity: ["low"],
      complaintDetected: false,
      isSpam: true,
      isAmbiguous: false,
      expectedTopics: ["spam", "marketing"],
    },
  },
  {
    id: "eval-spm-003",
    category: "spam",
    sourceType: "forum_post",
    feedbackText:
      "asdf jkl; 123489098 qwertyuiop [[[]]] --- random test automated ping payload 994821",
    expected: {
      sentiment: ["neutral"],
      sentimentScoreRange: [-0.2, 0.2],
      emotion: ["neutral"],
      intent: ["general_feedback"],
      severity: ["low"],
      complaintDetected: false,
      isSpam: true,
      isAmbiguous: true,
      expectedTopics: ["spam", "bot_gibberish"],
    },
  },

  // -------------------------------------------------------------
  // 11. AMBIGUOUS / FRAGMENTED / SARCASM CONTENT
  // -------------------------------------------------------------
  {
    id: "eval-amb-001",
    category: "ambiguous",
    sourceType: "survey",
    rating: 3,
    feedbackText: "ok",
    expected: {
      sentiment: ["neutral", "positive"],
      sentimentScoreRange: [-0.2, 0.3],
      emotion: ["neutral"],
      intent: ["general_feedback"],
      severity: ["low"],
      complaintDetected: false,
      isSpam: false,
      isAmbiguous: true,
      expectedTopics: ["general"],
    },
  },
  {
    id: "eval-amb-002",
    category: "ambiguous",
    sourceType: "app_store",
    rating: 1,
    feedbackText: "???",
    expected: {
      sentiment: ["neutral", "negative"],
      sentimentScoreRange: [-0.5, 0.1],
      emotion: ["confusion", "neutral", "frustration"],
      intent: ["general_feedback", "question"],
      severity: ["low", "medium"],
      complaintDetected: false,
      isSpam: false,
      isAmbiguous: true,
      expectedTopics: ["general"],
    },
  },
  {
    id: "eval-amb-003",
    category: "ambiguous",
    sourceType: "twitter",
    feedbackText:
      "Great job rolling out that untested update right at 5 PM on a Friday. Truly visionary engineering leadership.",
    expected: {
      sentiment: ["negative", "very_negative"],
      sentimentScoreRange: [-0.9, -0.4],
      emotion: ["frustration", "anger", "disappointment"],
      intent: ["complaint", "bug_report"],
      severity: ["medium", "high"],
      complaintDetected: true,
      isSpam: false,
      isAmbiguous: false,
      expectedTopics: ["sarcasm", "updates", "engineering", "deployment"],
    },
  },
  {
    id: "eval-amb-004",
    category: "ambiguous",
    sourceType: "trustpilot",
    rating: 5,
    feedbackText:
      "Worst piece of software ever written. Horrible customer service and broken from day one.",
    expected: {
      sentiment: ["negative", "very_negative"],
      sentimentScoreRange: [-1.0, -0.6],
      emotion: ["anger", "frustration", "disappointment"],
      intent: ["complaint"],
      severity: ["high", "medium"],
      complaintDetected: true,
      isSpam: false,
      isAmbiguous: true, // 5-star rating contradiction makes it ambiguous/contradictory
      expectedTopics: ["contradiction", "customer_support", "software_quality"],
    },
  },
];
