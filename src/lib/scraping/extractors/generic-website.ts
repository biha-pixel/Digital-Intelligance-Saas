import * as cheerio from "cheerio";
import { SourceType } from "@/types/database.types";
import { BaseExtractor } from "./base";
import { ExtractedFeedback, ExtractionResult } from "../types";
import { CxArticleExtractor } from "./article";

export class GenericWebExtractor extends BaseExtractor {
  public readonly sourceType: SourceType = "generic_web";
  private articleExtractor = new CxArticleExtractor();

  public extract(html: string, pageUrl: string): ExtractionResult {
    const $ = cheerio.load(html);
    const items: ExtractedFeedback[] = [];

    // Remove script, style, noscript, nav, footer, header, cookie notices to avoid noise
    $(
      "script, style, noscript, nav, footer, header, svg, form, iframe, " +
      ".cookie-banner, #cookie-notice, .ad, .advertisement, [aria-label*='cookie']"
    ).remove();

    // 1. Look for explicit testimonial or review blocks
    const testimonialCards = $(
      'blockquote, [class*="testimonial"], [class*="review"], [class*="feedback"], [data-testimonial]'
    );

    testimonialCards.each((index, element) => {
      const el = $(element);
      const text = el.text().trim();

      if (text.length >= 20 && text.length <= 2500) {
        const rawAuthor =
          el.find('cite, [class*="author"], [class*="name"], strong, span.author').first().text().trim() || undefined;

        // Check for rating inside testimonial if present
        let rating: number | undefined;
        const starSpan = el.find('[class*="star"], [aria-label*="star"], [data-rating]');
        const starAttr = starSpan.attr("data-rating") || starSpan.attr("aria-label") || "";
        const starMatch = starAttr.match(/([1-5])/);
        if (starMatch) {
          rating = parseInt(starMatch[1], 10);
        }

        const externalId = el.attr("id") || `testimonial_${index}_${text.slice(0, 16).replace(/\W+/g, "_")}`;

        const feedback = this.buildFeedbackItem({
          externalId,
          rawAuthorName: rawAuthor,
          contentText: text,
          rating,
          languageCode: "en",
          feedbackType: "review",
          rawPayload: {
            blockType: "testimonial_element",
            index,
          },
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

    // 2. If no testimonials found, try CX Article extraction
    if (items.length === 0) {
      const articleResult = this.articleExtractor.extract(html, pageUrl);
      if (articleResult.items.length > 0) {
        return articleResult;
      }

      // 3. Fallback: extract prominent body paragraphs if they contain user feedback signals
      const mainContent = $("main, article, #content, .content, body");
      const paragraphs = mainContent.find("p");

      paragraphs.each((index, p) => {
        const text = $(p).text().trim();
        if (text.length >= 50 && text.length <= 1500) {
          const feedback = this.buildFeedbackItem({
            externalId: `para_${index}`,
            contentText: text,
            languageCode: "en",
            feedbackType: "comment",
            rawPayload: {
              paragraphIndex: index,
            },
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
