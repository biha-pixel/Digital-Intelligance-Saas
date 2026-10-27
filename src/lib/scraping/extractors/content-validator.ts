import { ExtractedFeedback } from "../types";

/**
 * ContentValidator
 *
 * Validates that extracted feedback is actually review content, not generic website noise.
 * Rejects misleading content before it reaches the database.
 */
export class ContentValidator {
  /**
   * Maximum safe content length (characters)
   * Reviews should be concise - very long blocks are likely documentation or articles
   */
  private static readonly MAX_SAFE_LENGTH = 5000;

  /**
   * Minimum content length to be considered a meaningful review/comment
   */
  private static readonly MIN_REVIEW_LENGTH = 20;

  /**
   * Keywords that indicate content is NOT a review
   */
  private static readonly NON_REVIEW_KEYWORDS = [
    // Legal/Corporate
    "©", "copyright", "trademark", "all rights reserved", "laws concerning",
    "terms of service", "privacy policy", "cookie policy",

    // General Noise
    "keyword", "image", "video", "audio", "download", "subscribe", "login", "signup",
    "enter your email", "please wait", "loading", "javascript", "css", "html",

    // Navigation/Structure
    "home", "about", "contact", "services", "products", "portfolio",
    "menu", "navigation", "sitemap", "rss feed",

    // Support/Registration
    "support ticket", "create account", "sign in", "log in",
    "forgot password", "reset", "contact us", "get in touch",

    // Generic Polish marketing
    "guided by rich legacy", "leading manufacturer", "proudly powered by",
    "innovation excellence", "trust us", "choose us", "experience excellence"
  ];

  /**
   * Checks if content is maliciously long or clearly invalid
   */
  private static isContentLengthInvalid(contentText: string | undefined): boolean {
    if (!contentText) return true;
    const length = contentText.length;
    return length > ContentValidator.MAX_SAFE_LENGTH || length < ContentValidator.MIN_REVIEW_LENGTH;
  }

  /**
   * Checks if content contains non-review keywords
   */
  private static containsNonReviewKeywords(contentText: string): boolean {
    const lowerText = contentText.toLowerCase();

    // Check if any non-review keywords are present
    return ContentValidator.NON_REVIEW_KEYWORDS.some(keyword =>
      lowerText.includes(keyword.toLowerCase())
    );
  }

  /**
   * Checks if content looks like a proper review (has structured fields)
   */
  private static isStructuredReview(feedback: ExtractedFeedback): boolean {
    // Requirement: Must have content text
    if (!feedback.contentText || feedback.contentText.trim().length < ContentValidator.MIN_REVIEW_LENGTH) {
      return false;
    }

    // For platforms where ratings/dates are expected (Trustpilot, App Store, etc.)
    const isReviewPlatform = ['trustpilot', 'google_maps', 'yelp', 'g2', 'capterra', 'app_store', 'play_store'].includes(feedback.sourceType);

    if (feedback.feedbackType === 'cx_article') {
      return true;
    }

    // For review platforms, require structured fields
    if (isReviewPlatform) {
      const hasRating = feedback.rating != null && feedback.rating >= 1 && feedback.rating <= 5;
      const hasDate = feedback.postedAt != null;
      const hasAuthor = feedback.authorDisplayName != null && feedback.authorDisplayName.trim().length > 0;

      // Review platforms should have at least rating OR (date AND author)
      return hasRating || (hasDate && hasAuthor);
    }

    // For other content (Reddit, comments, forum posts) - be more lenient
    // Just require meaningful content and at least some signal (author OR date)
    const hasAuthor = feedback.authorDisplayName != null && feedback.authorDisplayName.trim().length > 0;
    const hasDate = feedback.postedAt != null;

    return hasAuthor || hasDate;
  }

  /**
   * Validates if extracted feedback should be kept or rejected
   */
  public static validateFeedback(feedback: ExtractedFeedback): {
    isValid: boolean;
    reason?: string;
    severity: 'error' | 'warning' | 'success' | null;
  } {
    // 1. Check length first (fast filter)
    if (ContentValidator.isContentLengthInvalid(feedback.contentText)) {
      return {
        isValid: false,
        reason: `Content length is ${feedback.contentText?.length || 0} characters (must be 20-5000)`,
        severity: 'error',
      };
    }

    // 2. Check for non-review content (content regex patterns)
    if (ContentValidator.containsNonReviewKeywords(feedback.contentText || '')) {
      return {
        isValid: false,
        reason: 'Content contains non-review language (legal, nav, corporate text)',
        severity: 'error',
      };
    }

    // 3. Check for structured review characteristics
    if (!ContentValidator.isStructuredReview(feedback)) {
      return {
        isValid: false,
        reason: 'Missing review signals (no rating, date, or author)',
        severity: 'error',
      };
    }

    return {
      isValid: true,
      severity: 'success',
    };
  }

  /**
   * Validates a batch of extracted items and returns only valid ones
   */
  public static validateBatch(items: ExtractedFeedback[]): {
    valid: ExtractedFeedback[];
    invalid: Array<{ item: ExtractedFeedback; reason: string; severity: 'error' | 'warning' }>;
    stats: {
      total: number;
      valid: number;
      invalid: number;
      errorCount: number;
      warningCount: number;
      successCount?: number;
    };
  } {
    const valid: ExtractedFeedback[] = [];
    const invalid: Array<{ item: ExtractedFeedback; reason: string; severity: 'error' | 'warning' }> = [];

    for (const item of items) {
      const validation = this.validateFeedback(item);

      if (validation.isValid) {
        valid.push(item);
      } else {
        invalid.push({
          item,
          reason: validation.reason || 'Unknown reason',
          severity: validation.severity === 'warning' ? 'warning' : 'error',
        });
      }
    }

    return {
      valid,
      invalid,
      stats: {
        total: items.length,
        valid: valid.length,
        invalid: invalid.length,
        errorCount: invalid.filter(i => i.severity === 'error').length,
        warningCount: invalid.filter(i => i.severity === 'warning').length,
      },
    };
  }
}
