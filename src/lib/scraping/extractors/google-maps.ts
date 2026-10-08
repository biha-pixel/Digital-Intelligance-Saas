import * as cheerio from "cheerio";
import { SourceType } from "@/types/database.types";
import { BaseExtractor } from "./base";
import { ExtractedFeedback, ExtractionResult } from "../types";

export class GoogleMapsExtractor extends BaseExtractor {
  public readonly sourceType: SourceType = "google_maps";

  /**
   * Parses human-relative date expressions into approximate ISO-8601 timestamps.
   * e.g. "a week ago", "3 days ago", "2 months ago", "yesterday", "1 year ago"
   */
  public parseRelativeDate(text: string, referenceDate: Date = new Date()): string | undefined {
    if (!text) return undefined;
    const clean = text.trim().toLowerCase();

    // Check direct ISO/standard date string first
    const directDate = new Date(clean);
    if (!isNaN(directDate.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(clean)) {
      return directDate.toISOString();
    }

    const now = referenceDate.getTime();
    const msMinute = 60 * 1000;
    const msHour = 60 * msMinute;
    const msDay = 24 * msHour;
    const msWeek = 7 * msDay;
    const msMonth = 30 * msDay;
    const msYear = 365 * msDay;

    if (clean.includes("just now") || clean.includes("moments ago")) {
      return new Date(now).toISOString();
    }
    if (clean.includes("yesterday")) {
      return new Date(now - msDay).toISOString();
    }

    const match = clean.match(/(\d+|a|an)\s+(minute|hour|day|week|month|year)s?\s+ago/i);
    if (!match) {
      return undefined;
    }

    const amountStr = match[1];
    const unit = match[2];
    const amount = amountStr === "a" || amountStr === "an" ? 1 : parseInt(amountStr, 10);

    let offsetMs = 0;
    switch (unit) {
      case "minute":
        offsetMs = amount * msMinute;
        break;
      case "hour":
        offsetMs = amount * msHour;
        break;
      case "day":
        offsetMs = amount * msDay;
        break;
      case "week":
        offsetMs = amount * msWeek;
        break;
      case "month":
        offsetMs = amount * msMonth;
        break;
      case "year":
        offsetMs = amount * msYear;
        break;
    }

    return new Date(now - offsetMs).toISOString();
  }

  public extract(html: string, pageUrl: string): ExtractionResult {
    const $ = cheerio.load(html);
    const items: ExtractedFeedback[] = [];

    // Common Google Maps review element selectors
    const reviewElements = $(
      'div[data-review-id], div.jftiEf, div.gws-localreviews__google-review, div[class*="review-dialog-list"] > div, div[jslog*="review"], div[class*="review-item"]'
    );

    reviewElements.each((_, element) => {
      const card = $(element);

      // Extract review ID
      const externalId =
        card.attr("data-review-id") ||
        card.attr("id") ||
        card.attr("data-fid") ||
        undefined;

      // Raw author name for display & SHA-256 pseudonymization
      const authorElem = card
        .find('div.d4r55, a[data-href*="contrib"], span.X5PpBb, div[class*="author-name"], [class*="TSUbDb"] a, .section-review-title')
        .first();
      const rawAuthorName = authorElem.text().trim() || undefined;
      const rawAuthorUrl = authorElem.attr("data-href") || authorElem.attr("href") || undefined;

      // Rating (1-5 stars)
      let rating: number | undefined;
      const starSpan = card.find('span[role="img"][aria-label*="star"], span.kvMYJc[aria-label], span[aria-label*="stars"], span.z3HNkc');
      const ariaLabel = starSpan.attr("aria-label") || "";
      const ratingMatch = ariaLabel.match(/([1-5](?:\.[0-9])?)\s+stars?/i) || ariaLabel.match(/Rated\s+([1-5])/i);

      if (ratingMatch) {
        rating = Math.round(parseFloat(ratingMatch[1]));
      }

      // Review text
      const reviewText = card
        .find('span.wiI7fc, span[data-expandable-section], div.MyEned, [class*="review-text"], div[class*="review-snippet"]')
        .first()
        .text()
        .trim();

      // Relative date text (e.g. "a week ago", "3 months ago")
      const dateElem = card
        .find('span.rsqaWe, span.dehNs, [class*="publish-date"], span[class*="review-date"]')
        .first();
      const rawDateText = dateElem.text().trim();
      const postedAt = this.parseRelativeDate(rawDateText);

      if (reviewText) {
        const feedback = this.buildFeedbackItem({
          externalId,
          rawAuthorName,
          rawAuthorUrl,
          contentText: reviewText,
          rating,
          postedAt,
          languageCode: "en",
          feedbackType: rating && rating <= 2 ? "complaint" : "review",
          rawPayload: {
            ariaLabel: ariaLabel || undefined,
            rawDateText: rawDateText || undefined,
            likesCount: card.find('[aria-label*="like"], [class*="helpful"]').text().trim() || undefined,
          },
          metadata: {
            sourceUrl: pageUrl,
            relativeDate: rawDateText || undefined,
          },
        });

        if (feedback) {
          items.push(feedback);
        }
      }
    });

    const pageTitle = $("title").text().trim();

    return {
      sourceType: this.sourceType,
      items,
      pageTitle: pageTitle || undefined,
      totalExtracted: items.length,
    };
  }
}
