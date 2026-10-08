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

      // Extract external ID (platform-native review identifier)
      const externalId =
        card.attr("data-service-review-card-id") ||
        card.attr("id") ||
        card.find('a[href*="/reviews/"]').first().attr("href")?.split("/reviews/")?.[1]?.split("?")?.[0] ||
        undefined;

      // Extract author raw name for display and SHA-256 pseudonymization
      const rawAuthorName =
        card.find('[data-consumer-name-typography], [class*="consumer-information__name"], [class*="consumer-name"]')
          .first()
          .text()
          .trim() || undefined;

      const authorProfileUrl =
        card.find('a[href*="/users/"]').first().attr("href") || undefined;

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

      const fullText = reviewTitle && reviewBody
        ? `${reviewTitle}\n\n${reviewBody}`
        : reviewTitle || reviewBody;

      // Extract date posted
      let postedAt: string | undefined;
      const timeTag = card.find("time");
      if (timeTag.attr("datetime")) {
        try {
          const parsed = new Date(timeTag.attr("datetime")!);
          if (!isNaN(parsed.getTime())) {
            postedAt = parsed.toISOString();
          }
        } catch {
          // Ignore invalid date strings
        }
      }

      // If no datetime attribute, try time tag text or date string
      if (!postedAt && timeTag.text().trim()) {
        try {
          const parsed = new Date(timeTag.text().trim());
          if (!isNaN(parsed.getTime())) {
            postedAt = parsed.toISOString();
          }
        } catch {
          // Ignore
        }
      }

      if (fullText) {
        const feedback = this.buildFeedbackItem({
          externalId,
          rawAuthorName,
          rawAuthorUrl: authorProfileUrl,
          contentText: fullText,
          rating,
          postedAt,
          languageCode: "en",
          feedbackType: rating && rating <= 2 ? "complaint" : "review",
          rawPayload: {
            title: reviewTitle || undefined,
            rawRating: altText || ratingImg.attr("data-service-review-rating") || undefined,
            hasVerifiedBadge: card.find('[data-badge="verified"], [class*="verified-badge"]').length > 0,
          },
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
