import * as cheerio from "cheerio";
import { SourceType } from "@/types/database.types";
import { BaseExtractor } from "./base";
import { ExtractedFeedback, ExtractionResult } from "../types";

export class GoogleMapsExtractor extends BaseExtractor {
  public readonly sourceType: SourceType = "google_maps";

  public extract(html: string, pageUrl: string): ExtractionResult {
    const $ = cheerio.load(html);
    const items: ExtractedFeedback[] = [];

    // Common Google Maps review element selectors
    const reviewElements = $(
      'div[data-review-id], div.jftiEf, div.gws-localreviews__google-review, div[class*="review-dialog-list"] > div, div[jslog*="review"]'
    );

    reviewElements.each((_, element) => {
      const card = $(element);

      // Raw author name for SHA-256 pseudonymization (never stored in clear text)
      const rawAuthorName =
        card
          .find('div.d4r55, a[data-href*="contrib"], span.X5PpBb, div[class*="author-name"]')
          .first()
          .text()
          .trim() || undefined;

      // Rating (1-5 stars)
      let rating: number | undefined;
      const starSpan = card.find('span[role="img"][aria-label*="star"], span.kvMYJc[aria-label], span[aria-label*="stars"]');
      const ariaLabel = starSpan.attr("aria-label") || "";
      const ratingMatch = ariaLabel.match(/([1-5](?:\.[0-9])?)\s+stars?/i) || ariaLabel.match(/Rated\s+([1-5])/i);

      if (ratingMatch) {
        rating = Math.round(parseFloat(ratingMatch[1]));
      }

      // Review text
      const reviewText = card
        .find('span.wiI7fc, span[data-expandable-section], div.MyEned, [class*="review-text"]')
        .first()
        .text()
        .trim();

      // Relative date text (e.g. "a week ago", "3 months ago")
      const dateText = card
        .find('span.rsqaWe, span.dehNs, [class*="publish-date"]')
        .first()
        .text()
        .trim();

      if (reviewText) {
        const feedback = this.buildFeedbackItem({
          rawAuthorName,
          contentText: reviewText,
          rating,
          languageCode: "en",
          metadata: {
            sourceUrl: pageUrl,
            relativeDate: dateText || undefined,
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
