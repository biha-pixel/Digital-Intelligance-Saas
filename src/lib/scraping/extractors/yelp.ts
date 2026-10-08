import * as cheerio from "cheerio";
import { SourceType } from "@/types/database.types";
import { BaseExtractor } from "./base";
import { ExtractedFeedback, ExtractionResult } from "../types";

export class YelpExtractor extends BaseExtractor {
  public readonly sourceType: SourceType = "yelp";

  public extract(html: string, pageUrl: string): ExtractionResult {
    const $ = cheerio.load(html);
    const items: ExtractedFeedback[] = [];

    // Select review containers
    const reviewCards = $(
      'div[class*="review__"], li[class*="margin-b"], div[data-testid*="review"], div[class*="review-card"], div[data-review-id]'
    );

    reviewCards.each((_, element) => {
      const card = $(element);

      // Extract external review ID
      const externalId =
        card.attr("data-review-id") ||
        card.attr("id") ||
        card.find("[data-review-id]").first().attr("data-review-id") ||
        undefined;

      // Extract raw author name & profile link for display and SHA-256 pseudonymization
      const userLink = card.find('a[href*="/user_details"], a[class*="user-passport-info"], a[class*="user-name"]').first();
      const rawAuthorName = userLink.text().trim() || undefined;
      const rawAuthorUrl = userLink.attr("href") || undefined;

      // Extract rating (1-5)
      let rating: number | undefined;
      const ratingDiv = card.find('div[aria-label*="star rating"], span[aria-label*="star rating"], [class*="five-stars"], [aria-label*="star"]');
      const ariaLabel = ratingDiv.attr("aria-label") || "";
      const ratingMatch = ariaLabel.match(/([1-5](?:\.[0-9])?)\s+star\s+rating/i) || ariaLabel.match(/([1-5])\s+stars?/i);

      if (ratingMatch) {
        rating = Math.round(parseFloat(ratingMatch[1]));
      }

      // Review text
      const commentText = card
        .find('p[class*="comment__"], span[class*="raw__"], [class*="review-content"], p.comment')
        .first()
        .text()
        .trim();

      // Date parsing
      let postedAt: string | undefined;
      const dateSpan = card.find('span[class*="date__"], span[class*="css-chan9m"], span[class*="css-1"], time, span.date');
      const rawDate = dateSpan.text().trim() || dateSpan.attr("datetime") || "";
      if (rawDate) {
        try {
          const parsedDate = new Date(rawDate);
          if (!isNaN(parsedDate.getTime())) {
            postedAt = parsedDate.toISOString();
          }
        } catch {
          // Ignore invalid date
        }
      }

      if (commentText) {
        const feedback = this.buildFeedbackItem({
          externalId,
          rawAuthorName,
          rawAuthorUrl,
          contentText: commentText,
          rating,
          postedAt,
          languageCode: "en",
          feedbackType: rating && rating <= 2 ? "complaint" : "review",
          rawPayload: {
            ariaLabel: ariaLabel || undefined,
            rawDate: rawDate || undefined,
            userLocation: card.find('[class*="user-location"], span[class*="location"]').first().text().trim() || undefined,
          },
          metadata: {
            sourceUrl: pageUrl,
            rawDate: rawDate || undefined,
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
