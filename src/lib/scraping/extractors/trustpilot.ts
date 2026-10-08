import * as cheerio from "cheerio";
import { SourceType } from "@/types/database.types";
import { BaseExtractor } from "./base";
import { ExtractedFeedback, ExtractionResult } from "../types";

export class TrustpilotExtractor extends BaseExtractor {
  public readonly sourceType: SourceType = "trustpilot";

  public extract(html: string, pageUrl: string): ExtractionResult {
    const $ = cheerio.load(html);
    const items: ExtractedFeedback[] = [];

    // Find all review cards/articles
    const reviewCards = $(
      'article, div[data-service-review-card-id], div[class*="styles_reviewCard"], div[class*="review-card"]'
    );

    reviewCards.each((_, element) => {
      const card = $(element);

      // Extract author raw name for SHA-256 pseudonymization (never stored in clear text)
      const rawAuthorName =
        card.find('[data-consumer-name-typography], [class*="consumer-information__name"], [class*="consumer-name"]')
          .first()
          .text()
          .trim() || undefined;

      // Extract rating (1-5)
      let rating: number | undefined;
      const ratingImg = card.find('img[alt*="Rated"], img[alt*="star"], [data-service-review-rating]');
      const altText = ratingImg.attr("alt") || "";
      const ratingMatch = altText.match(/Rated\s+([1-5])\s+out\s+of\s+5/i) || altText.match(/([1-5])\s+stars?/i);

      if (ratingMatch) {
        rating = parseInt(ratingMatch[1], 10);
      } else {
        const dataRating = ratingImg.attr("data-service-review-rating");
        if (dataRating) {
          rating = parseInt(dataRating, 10);
        }
      }

      // Extract review title & content
      const reviewTitle = card
        .find('[data-service-review-title-typography], h2, [class*="review-title"]')
        .first()
        .text()
        .trim();

      const reviewBody = card
        .find('[data-service-review-text-typography], p[class*="review-content__text"], [class*="review-content"]')
        .first()
        .text()
        .trim();

      const fullText = reviewTitle ? `${reviewTitle}\n\n${reviewBody}` : reviewBody;

      // Extract date posted
      let postedAt: string | undefined;
      const timeTag = card.find("time");
      if (timeTag.attr("datetime")) {
        try {
          postedAt = new Date(timeTag.attr("datetime")!).toISOString();
        } catch {
          // Ignore invalid date strings
        }
      }

      if (fullText) {
        const feedback = this.buildFeedbackItem({
          rawAuthorName,
          contentText: fullText,
          rating,
          postedAt,
          languageCode: "en",
          metadata: {
            sourceUrl: pageUrl,
            hasTitle: Boolean(reviewTitle),
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
