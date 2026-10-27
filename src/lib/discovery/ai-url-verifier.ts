import { z } from "zod";
import { getDefaultAIProvider } from "@/lib/ai";
import { SourceType } from "@/types/database.types";

/**
 * AI-Powered URL Verification Service
 *
 * Uses AI to intelligently verify if discovered URLs are actual review/feedback pages
 * or just generic profile/company pages that won't yield useful content.
 */

export const URLVerificationSchema = z.object({
  isReviewPage: z.boolean().describe("Whether this URL is likely to contain reviews, feedback, or user-generated content"),
  confidence: z.number().min(0).max(1).describe("Confidence score for this assessment"),
  reasoning: z.string().describe("Brief explanation of why this is or isn't a review page"),
  expectedContentType: z.enum([
    "customer_reviews",
    "forum_discussion",
    "social_media_post",
    "company_profile",
    "generic_website",
    "error_page"
  ]).describe("Type of content expected on this page"),
  shouldScrape: z.boolean().describe("Whether we should proceed with scraping this URL"),
});

export type URLVerificationResult = z.infer<typeof URLVerificationSchema>;

/**
 * Verifies if a URL is worth scraping using AI analysis
 */
export async function verifyURLWithAI(
  url: string,
  sourceType: SourceType,
  context?: {
    title?: string;
    snippet?: string;
    companyName?: string;
  }
): Promise<URLVerificationResult> {
  const aiProvider = getDefaultAIProvider();

  const prompt = buildVerificationPrompt(url, sourceType, context);

  try {
    const result = await aiProvider.generateStructured({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      schema: URLVerificationSchema,
      schemaName: "URLVerificationSchema",
      schemaDescription: "Schema for verifying if a URL contains review/feedback content",
      systemPrompt: `You are an expert at analyzing URLs and determining if they contain customer reviews, feedback, or user-generated content.

Your job is to look at a URL and predict whether it will have:
- Customer reviews (Trustpilot, Yelp, Google Maps, App Store, etc.)
- Forum discussions (Reddit threads, forum posts)
- Social media posts with comments (TikTok videos, YouTube videos, Instagram posts, Twitter threads)

REJECT these types of URLs:
- Company homepages or "about" pages
- Social media profile pages without specific posts (e.g., instagram.com/company - NO, instagram.com/p/ABC123 - YES)
- Generic search results or directory listings
- 404 or error pages
- App store category pages without reviews

ACCEPT these types of URLs:
- Review platform pages (Trustpilot, Yelp, Google Maps reviews)
- Specific Reddit threads (reddit.com/r/.../comments/...)
- Specific social media posts (instagram.com/p/..., tiktok.com/@user/video/..., youtube.com/watch?v=...)
- App store app pages (apps.apple.com/app/..., play.google.com/store/apps/details?id=...)

Be strict - only approve URLs that will definitely have user-generated content.`,
      temperature: 0.1,
      maxTokens: 500,
    });

    return result.data;
  } catch (error) {
    console.error(`[AI Verification Error] ${url} | ${error instanceof Error ? error.message : "Unknown error"}`);

    // Fallback to rule-based verification
    return ruleBasedVerificationFallback(url, sourceType);
  }
}

/**
 * Builds verification prompt with context
 */
function buildVerificationPrompt(
  url: string,
  sourceType: SourceType,
  context?: {
    title?: string;
    snippet?: string;
    companyName?: string;
  }
): string {
  let prompt = `Analyze this URL and determine if it contains customer reviews, feedback, or user-generated content:\n\nURL: ${url}\nSource Type: ${sourceType}`;

  if (context?.title) {
    prompt += `\nPage Title: ${context.title}`;
  }

  if (context?.snippet) {
    prompt += `\nSearch Snippet: ${context.snippet}`;
  }

  if (context?.companyName) {
    prompt += `\nCompany: ${context.companyName}`;
  }

  prompt += `\n\nDetermine:
1. Is this likely a page WITH reviews/comments/feedback?
2. Or is it just a profile/homepage/category page?
3. Should we scrape this URL?

For social media:
- Profile pages (instagram.com/username) = NO
- Specific posts (instagram.com/p/ABC123) = YES
- YouTube channels (youtube.com/c/channel) = NO
- Specific videos (youtube.com/watch?v=...) = YES

For review platforms:
- Company review pages (trustpilot.com/review/company.com) = YES
- Category pages (trustpilot.com/categories/...) = NO

Return exactly this JSON object shape, with every field present:
{
  "isReviewPage": true,
  "confidence": 0.0,
  "reasoning": "brief explanation",
  "expectedContentType": "customer_reviews | forum_discussion | social_media_post | company_profile | generic_website | error_page",
  "shouldScrape": true
}
Do not return a wrapper object, Markdown, or omitted fields.`;

  return prompt;
}

/**
 * Rule-based fallback when AI fails
 */
function ruleBasedVerificationFallback(
  url: string,
  sourceType: SourceType
): URLVerificationResult {
  const lowerUrl = url.toLowerCase();

  // Social media profile detection (REJECT)
  const isSocialProfile =
    // Instagram profile (not post)
    (/instagram\.com\/[^/]+\/?$/.test(lowerUrl) && !lowerUrl.includes("/p/")) ||
    // TikTok profile (not video)
    (/tiktok\.com\/@[^/]+\/?$/.test(lowerUrl) && !lowerUrl.includes("/video/")) ||
    // Twitter profile (not status)
    (/(twitter\.com|x\.com)\/[^/]+\/?$/.test(lowerUrl) && !lowerUrl.includes("/status/")) ||
    // YouTube channel (not watch)
    (/youtube\.com\/(c|channel|user)\//.test(lowerUrl) && !lowerUrl.includes("/watch")) ||
    // Facebook profile (not posts)
    (/facebook\.com\/[^/]+\/?$/.test(lowerUrl) && !lowerUrl.includes("/posts/"));

  if (isSocialProfile) {
    return {
      isReviewPage: false,
      confidence: 0.9,
      reasoning: "This is a social media profile page without a specific post URL",
      expectedContentType: "company_profile",
      shouldScrape: false,
    };
  }

  // Review platform detection (ACCEPT)
  const isReviewPlatform =
    /trustpilot\.com\/review\//.test(lowerUrl) ||
    /yelp\.com\/biz\//.test(lowerUrl) ||
    /g2\.com\/products\//.test(lowerUrl) ||
    /capterra\.com\/software\//.test(lowerUrl) ||
    /maps\.google\.com|google\.com\/maps/.test(lowerUrl) ||
    /apps\.apple\.com\/.*\/app\//.test(lowerUrl) ||
    /play\.google\.com\/store\/apps\/details/.test(lowerUrl);

  if (isReviewPlatform) {
    return {
      isReviewPage: true,
      confidence: 0.95,
      reasoning: "This is a known review platform URL",
      expectedContentType: "customer_reviews",
      shouldScrape: true,
    };
  }

  // Reddit thread detection (ACCEPT)
  const isRedditThread = /reddit\.com\/r\/[^/]+\/comments\//.test(lowerUrl);
  if (isRedditThread) {
    return {
      isReviewPage: true,
      confidence: 0.9,
      reasoning: "This is a Reddit thread with discussions",
      expectedContentType: "forum_discussion",
      shouldScrape: true,
    };
  }

  // Social media specific post (ACCEPT)
  const isSpecificPost =
    /instagram\.com\/p\//.test(lowerUrl) ||
    /tiktok\.com\/@.*\/video\//.test(lowerUrl) ||
    /(twitter\.com|x\.com)\/.*\/status\//.test(lowerUrl) ||
    /youtube\.com\/watch\?v=/.test(lowerUrl) ||
    /facebook\.com\/.*\/posts\//.test(lowerUrl);

  if (isSpecificPost) {
    return {
      isReviewPage: true,
      confidence: 0.85,
      reasoning: "This is a specific social media post that may have comments",
      expectedContentType: "social_media_post",
      shouldScrape: true,
    };
  }

  // Generic website or unknown
  return {
    isReviewPage: false,
    confidence: 0.6,
    reasoning: "Cannot determine if this URL contains reviews",
    expectedContentType: "generic_website",
    shouldScrape: false,
  };
}

/**
 * Batch verification for multiple URLs
 */
export async function verifyURLBatch(
  urls: Array<{
    url: string;
    sourceType: SourceType;
    context?: { title?: string; snippet?: string; companyName?: string };
  }>
): Promise<Map<string, URLVerificationResult>> {
  const results = new Map<string, URLVerificationResult>();

  // Process in parallel (max 5 at a time to avoid rate limits)
  const batchSize = 5;
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async ({ url, sourceType, context }) => ({
        url,
        result: await verifyURLWithAI(url, sourceType, context),
      }))
    );

    for (const { url, result } of batchResults) {
      results.set(url, result);
    }
  }

  return results;
}
