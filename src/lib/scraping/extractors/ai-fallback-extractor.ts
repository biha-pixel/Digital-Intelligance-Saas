import * as cheerio from "cheerio";
import { z } from "zod";
import { SourceType } from "@/types/database.types";
import { BaseExtractor } from "./base";
import { ExtractedFeedback, ExtractionResult } from "../types";
import { getDefaultAIProvider } from "@/lib/ai";

/**
 * AIFallbackExtractor
 *
 * Uses AI to extract feedback items when CSS-based extraction fails.
 * This works for ANY platform - Trustpilot, Reddit, social media, forums, etc.
 * The AI analyzes the raw HTML/text and identifies review-like content.
 */

// Zod schema for AI to extract reviews/feedback from any webpage
const ExtractedFeedbackItemSchema = z.object({
  externalId: z.string().optional(),
  authorName: z.string(),
  authorUrl: z.string().optional(),
  title: z.string().optional(),
  content: z.string(),
  rating: z.number().min(1).max(5).nullish().transform((value) => value ?? undefined),
  postedAt: z.string().datetime().nullish().transform((value) => value ?? undefined),
  isComplaint: z.boolean().optional(),
  sentiment: z.enum(["positive", "negative", "neutral"]).optional(),
});

export const AIExtractionResultSchema = z.object({
  extractedFeedback: z.array(ExtractedFeedbackItemSchema),
  pageType: z.enum(["review_page", "forum_thread", "social_media", "unknown"]),
  confidence: z.number().min(0).max(1),
});

export class AIFallbackExtractor extends BaseExtractor {
  public readonly sourceType: SourceType = "generic_web";

  public async extractWithAI(
    html: string,
    pageUrl: string,
    sourceType: SourceType
  ): Promise<ExtractionResult> {
    const items: ExtractedFeedback[] = [];
    const $ = cheerio.load(html);
    const textContent = $.text();

    // Truncate to reasonable size for AI (first 15K chars of meaningful content)
    const truncatedContent = textContent.slice(0, 15000);

    // Build context-aware prompt
    const platformContext = this.getPlatformContext(sourceType);
    const prompt = this.buildExtractionPrompt(truncatedContent, pageUrl, platformContext);

    try {
      const aiProvider = getDefaultAIProvider();

      const aiResult = await aiProvider.generateStructured({
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        schema: AIExtractionResultSchema,
        schemaName: "AIExtractionResultSchema",
        schemaDescription: "Schema for extracting review/feedback content from webpage text",
        systemPrompt: `You are an expert web scraping and content extraction system.
Your job is to analyze HTML-rendered page content and extract customer reviews, feedback,
forum posts, and social media mentions.

For each piece of content you find, extract:
- Author name (can be username or display name)
- Content text (the actual review/comment)
- Rating (1-5) if visible (look for star ratings, numerical scores, thumbs up/down)
- Date posted if visible
- Title if present
- Whether it appears to be a complaint/negative experience

Return an empty array if no review-like content is found. Be thorough - check for nested
comments, collapsed sections, and all visible text.

Output MUST be valid JSON only. No markdown, no text before or after.`,
        temperature: 0.1,
        maxTokens: 4000,
      });

      const data = aiResult.data;

      if (data?.extractedFeedback && Array.isArray(data.extractedFeedback)) {
        for (const extracted of data.extractedFeedback) {
          if (!extracted.content || extracted.content.length < 20) continue;

          const feedback = this.buildFeedbackItem({
            externalId: extracted.externalId,
            rawAuthorName: extracted.authorName,
            rawAuthorUrl: extracted.authorUrl,
            contentText: extracted.title
              ? `${extracted.title}\n\n${extracted.content}`
              : extracted.content,
            rating: extracted.rating,
            postedAt: extracted.postedAt,
            languageCode: "en",
            feedbackType: extracted.isComplaint || extracted.sentiment === "negative"
              ? "complaint"
              : extracted.rating && extracted.rating <= 2
                ? "complaint"
                : "review",
            rawPayload: {
              title: extracted.title,
              sentiment: extracted.sentiment,
              extractedByAI: true,
              confidence: data.confidence,
            },
            metadata: {
              sourceUrl: pageUrl,
              extractionMethod: "ai-fallback",
              pageType: data.pageType,
            },
          });

          if (feedback) {
            items.push(feedback);
          }
        }
      }

      console.log(`[AI Extraction] ${sourceType} | ${pageUrl} | Extracted ${items.length} items via AI (confidence: ${data?.confidence || "N/A"})`);
    } catch (error) {
      console.error(`[AI Extraction Error] ${sourceType} | ${pageUrl} | ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    return {
      sourceType: this.sourceType,
      items,
      pageTitle: $("title").text().trim() || undefined,
      totalExtracted: items.length,
    };
  }

  public extract(html: string, pageUrl: string): ExtractionResult {
    // This is a placeholder - the real extraction happens in extractWithAI
    const $ = cheerio.load(html);
    return {
      sourceType: this.sourceType,
      items: [],
      pageTitle: $("title").text().trim() || undefined,
      totalExtracted: 0,
    };
  }

  private getPlatformContext(sourceType: SourceType): string {
    const contexts: Record<SourceType, string> = {
      trustpilot: "This is a Trustpilot review page. Look for star ratings (1-5), review titles, consumer names, and verified purchase badges.",
      reddit: "This is a Reddit post/thread. Look for the post title, body text, and comments. Reddit usernames start with u/. Look for upvotes as agreement signals.",
      google_maps: "This is a Google Maps reviews page. Look for star ratings, review text, and dates.",
      yelp: "This is a Yelp business page. Look for star ratings, review text, and user names.",
      g2: "This is a G2 software review page. Look for star ratings, review titles, and detailed feedback.",
      capterra: "This is a Capterra software review page. Look for ratings and review content.",
      app_store: "This is an Apple App Store reviews page. Look for ratings and reviews.",
      play_store: "This is a Google Play Store reviews page. Look for ratings and reviews.",
      instagram: "This is an Instagram profile or post. Look for captions and comments.",
      tiktok: "This is a TikTok video. Look for video descriptions and comments.",
      twitter: "This is a Twitter/X post or thread. Look for tweet text and replies.",
      youtube: "This is a YouTube video. Look for video descriptions and comments.",
      facebook: "This is a Facebook post or page. Look for post content and comments.",
      generic_web: "This is a generic webpage. Look for any review-like content, comments, or feedback.",
    };
    return contexts[sourceType] || contexts.generic_web;
  }

  private buildExtractionPrompt(content: string, url: string, platformContext: string): string {
    return `Analyze the following webpage content from ${url} and extract all customer reviews, feedback, complaints, or user-generated content.

${platformContext}

Extract all review-like items from this page content:
---
${content}
---

Return a JSON object with:
- extractedFeedback: array of all review/feedback items found
- pageType: "review_page" | "forum_thread" | "social_media" | "unknown"
- confidence: your confidence level (0-1) for this extraction

For each feedback item, provide:
- authorName: the username or display name (required)
- content: the actual review/comment text (required)
- title: the review title if present
- rating: the rating (1-5) if visible; otherwise use null
- postedAt: the date in ISO 8601 format if visible; otherwise use null
- isComplaint: true if the content appears to be negative or a complaint
- sentiment: "positive", "negative", or "neutral"`;
  }
}

let aiExtractorInstance: AIFallbackExtractor | null = null;

export function getAIExtractor(): AIFallbackExtractor {
  if (!aiExtractorInstance) {
    aiExtractorInstance = new AIFallbackExtractor();
  }
  return aiExtractorInstance;
}
