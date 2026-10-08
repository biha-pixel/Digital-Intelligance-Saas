import * as cheerio from "cheerio";
import { SourceType } from "@/types/database.types";
import { BaseExtractor } from "./base";
import { ExtractedFeedback, ExtractionResult } from "../types";

export class CxArticleExtractor extends BaseExtractor {
  public readonly sourceType: SourceType = "generic_web";

  // Keywords that signal customer experience, satisfaction, service, or product review content
  private static readonly CX_KEYWORDS = [
    "customer experience",
    "customer service",
    "customer support",
    "user experience",
    "user satisfaction",
    "customer satisfaction",
    "support team",
    "support agent",
    "refund policy",
    "pricing model",
    "onboarding process",
    "ease of use",
    "feature request",
    "customer feedback",
    "review",
    "complaint",
    "frustration",
    "delighted",
    "disappointed",
    "recommend",
    "churn",
    "client experience",
    "nps",
    "csat",
  ];

  /**
   * Evaluates if a text block contains customer experience or sentiment signals.
   */
  public hasCxRelevance(text: string): boolean {
    const lower = text.toLowerCase();
    return CxArticleExtractor.CX_KEYWORDS.some((kw) => lower.includes(kw));
  }

  public extract(html: string, pageUrl: string): ExtractionResult {
    const $ = cheerio.load(html);
    const items: ExtractedFeedback[] = [];

    // Remove scripts, stylesheets, ads, navbars, footers, headers, cookie banners, modals, sidebars
    $(
      "script, style, noscript, nav, header, footer, svg, form, aside, " +
      ".cookie-banner, #cookie-notice, .advertisement, .ad, .social-share, " +
      ".newsletter-signup, .author-bio-box, .related-posts, .comments-section"
    ).remove();

    // 1. Extract Article Metadata (OpenGraph / JSON-LD / Meta tags)
    const pageTitle =
      $('meta[property="og:title"]').attr("content") ||
      $('meta[name="twitter:title"]').attr("content") ||
      $("h1").first().text().trim() ||
      $("title").text().trim();

    const authorByline =
      $('meta[name="author"]').attr("content") ||
      $('meta[property="article:author"]').attr("content") ||
      $('[class*="byline"], [class*="author-name"], a[rel="author"]').first().text().trim() ||
      undefined;

    let publishedAt: string | undefined;
    const metaDate =
      $('meta[property="article:published_time"]').attr("content") ||
      $('meta[name="pubdate"]').attr("content") ||
      $('meta[name="date"]').attr("content") ||
      $("time").first().attr("datetime") ||
      $("time").first().text().trim();

    if (metaDate) {
      try {
        const parsed = new Date(metaDate);
        if (!isNaN(parsed.getTime())) {
          publishedAt = parsed.toISOString();
        }
      } catch {
        // Ignore
      }
    }

    // 2. Extract Article Body Text
    const articleContainer = $("article, main, [role='main'], .post-content, .article-body, .entry-content");
    const container = articleContainer.length > 0 ? articleContainer : $("body");

    // Gather candidate paragraphs
    const paragraphs: string[] = [];
    container.find("p, blockquote, li").each((_, el) => {
      const pText = $(el).text().trim();
      // Only keep substantive paragraphs, discard short one-liners or copyright notices
      if (pText.length >= 40 && !pText.toLowerCase().includes("all rights reserved") && !pText.toLowerCase().includes("cookie policy")) {
        paragraphs.push(pText);
      }
    });

    // 3. Filter for CX-Relevant Sections or Combined Analysis
    const cxRelevantParagraphs = paragraphs.filter((p) => this.hasCxRelevance(p));

    if (cxRelevantParagraphs.length > 0) {
      // Group contiguous or relevant CX paragraphs into structured insight items
      const combinedArticleCx = cxRelevantParagraphs.join("\n\n");

      // Generate a stable externalId based on canonical URL or title
      const canonicalUrl = $('link[rel="canonical"]').attr("href") || pageUrl;
      const externalId = `cx_art_${encodeURIComponent(canonicalUrl).slice(-64)}`;

      const feedback = this.buildFeedbackItem({
        externalId,
        rawAuthorName: authorByline,
        contentText: combinedArticleCx,
        postedAt: publishedAt,
        languageCode: "en",
        feedbackType: "cx_article",
        rawPayload: {
          title: pageTitle || undefined,
          canonicalUrl,
          totalParagraphs: paragraphs.length,
          cxParagraphsCount: cxRelevantParagraphs.length,
        },
        metadata: {
          sourceUrl: pageUrl,
          isArticle: true,
          articleTitle: pageTitle || undefined,
        },
      });

      if (feedback) {
        items.push(feedback);
      }
    }

    return {
      sourceType: this.sourceType,
      items,
      pageTitle: pageTitle || undefined,
      totalExtracted: items.length,
    };
  }
}
