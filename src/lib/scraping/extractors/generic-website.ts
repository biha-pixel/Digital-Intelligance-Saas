import * as cheerio from "cheerio";
import { SourceType } from "@/types/database.types";
import { BaseExtractor } from "./base";
import { ExtractedFeedback, ExtractionResult } from "../types";

export class GenericWebExtractor extends BaseExtractor {
  public readonly sourceType: SourceType = "generic_web";

  public extract(html: string, pageUrl: string): ExtractionResult {
    const $ = cheerio.load(html);
    const items: ExtractedFeedback[] = [];

    // Remove script, style, nav, footer, header to avoid noise
    $("script, style, noscript, nav, footer, header, svg, form").remove();

    // 1. Look for explicit testimonial or review blocks
    const testimonialCards = $(
      'blockquote, [class*="testimonial"], [class*="review"], [class*="feedback"], [data-testimonial]'
    );

    testimonialCards.each((_, element) => {
      const el = $(element);
      const text = el.text().trim();

      if (text.length > 20 && text.length < 2000) {
        const rawAuthor =
          el.find('cite, [class*="author"], [class*="name"], strong').first().text().trim() || undefined;

        const feedback = this.buildFeedbackItem({
          rawAuthorName: rawAuthor,
          contentText: text,
          languageCode: "en",
          metadata: {
            sourceUrl: pageUrl,
            extractionType: "testimonial_block",
          },
        });

        if (feedback) {
          items.push(feedback);
        }
      }
    });

    // 2. If no testimonials found, extract primary article or body paragraphs
    if (items.length === 0) {
      const mainContent = $("main, article, #content, .content, body");
      const paragraphs = mainContent.find("p");

      paragraphs.each((_, p) => {
        const text = $(p).text().trim();
        if (text.length >= 40 && text.length <= 1500) {
          const feedback = this.buildFeedbackItem({
            contentText: text,
            languageCode: "en",
            metadata: {
              sourceUrl: pageUrl,
              extractionType: "body_paragraph",
            },
          });

          if (feedback) {
            items.push(feedback);
          }
        }
      });
    }

    const pageTitle = $("title").text().trim();

    return {
      sourceType: this.sourceType,
      items: items.slice(0, 50), // Cap at 50 extracted items per page
      pageTitle: pageTitle || undefined,
      totalExtracted: items.length,
    };
  }
}
