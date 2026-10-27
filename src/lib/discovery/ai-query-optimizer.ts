import { z } from "zod";
import { getDefaultAIProvider } from "@/lib/ai";
import { ProfileMatchingContext } from "./utils";
import { SearchQuery } from "./types";
import { SourceType } from "@/types/database.types";

/**
 * AI-Powered Search Query Optimizer
 *
 * Uses AI to generate better search queries that find actual content pages
 * (posts, videos, threads) instead of just profile/homepage URLs.
 *
 * Especially important for social media platforms where we want:
 * - Instagram posts (instagram.com/p/...) NOT profiles (instagram.com/username)
 * - TikTok videos (tiktok.com/@.../video/...) NOT profiles (tiktok.com/@username)
 * - YouTube videos (youtube.com/watch?v=...) NOT channels
 */

const OptimizedQuerySchema = z.object({
    query: z.string().describe("The optimized search query"),
    platform: z.string().describe("The platform this query targets"),
    reasoning: z.string().describe("Why this query will find actual content"),
    expectedResultType: z.enum([
      "review_page",
      "forum_thread",
      "social_post",
      "video_with_comments",
      "app_reviews"
    ]).describe("Type of results this query should return"),
  });

function normalizeOptimizedQueriesPayload(payload: unknown): unknown {
  if (!Array.isArray(payload) || !payload.every((query) => typeof query === "string")) {
    return payload;
  }

  return {
    queries: payload.map((query) => ({
      query,
      platform: "generic_web",
      reasoning: "Normalized from the model's documented compact query-list response.",
      expectedResultType: "review_page",
    })),
    totalQueries: payload.length,
  };
}

export const OptimizedQueriesSchema = z.preprocess(
  normalizeOptimizedQueriesPayload,
  z.object({
    queries: z.array(OptimizedQuerySchema).min(1).max(20),
    totalQueries: z.number().int().min(1).max(20),
  }).superRefine((value, context) => {
    if (value.totalQueries !== value.queries.length) {
      context.addIssue({
        code: "custom",
        path: ["totalQueries"],
        message: "totalQueries must equal the number of queries provided",
      });
    }
  })
);

export type OptimizedQuery = z.infer<typeof OptimizedQueriesSchema>["queries"][0];

/**
 * Generates AI-optimized search queries for finding reviews and feedback
 */
export async function generateOptimizedQueries(
  context: ProfileMatchingContext,
  platforms: string[] = ["all"]
): Promise<OptimizedQuery[]> {
  const aiProvider = getDefaultAIProvider();

  const prompt = buildQueryOptimizationPrompt(context, platforms);

  try {
    const result = await aiProvider.generateStructured({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      schema: OptimizedQueriesSchema,
      schemaName: "OptimizedQueriesSchema",
      schemaDescription: "Schema for generating optimized search queries",
      systemPrompt: `You are an expert at crafting Google/Serper search queries to find customer reviews, feedback, and user-generated content.

Your goal is to generate queries that find SPECIFIC CONTENT PAGES, not profile/homepage URLs.

**Social Media Best Practices:**

Instagram:
❌ BAD: "company name" site:instagram.com (returns profile)
✅ GOOD: site:instagram.com/p/ "company name" (returns posts)
✅ GOOD: site:instagram.com/reel/ "company name" (returns reels)

TikTok:
❌ BAD: "company name" site:tiktok.com/@
✅ GOOD: site:tiktok.com "company name" inurl:video
✅ GOOD: site:tiktok.com "@username" video

Twitter/X:
❌ BAD: "company name" site:twitter.com
✅ GOOD: site:twitter.com "company name" inurl:status
✅ GOOD: site:x.com "company name" (issue OR complaint OR review)

YouTube:
❌ BAD: "company name" site:youtube.com
✅ GOOD: site:youtube.com/watch "company name" review
✅ GOOD: site:youtube.com "company name" inurl:watch

Facebook:
❌ BAD: "company name" site:facebook.com
✅ GOOD: site:facebook.com "company name" inurl:posts
✅ GOOD: site:facebook.com "company name" (review OR experience)

**Review Platforms (already work well):**
- Trustpilot: site:trustpilot.com/review "company name"
- Reddit: site:reddit.com "company name" (review OR complaints OR experience)
- Yelp: site:yelp.com/biz "company name"
- Google Maps: "company name" reviews site:maps.google.com
- App stores: site:apps.apple.com "company name", site:play.google.com/store/apps "company name"

**Key Rules:**
1. Use inurl: to target specific URL patterns (inurl:video, inurl:posts, inurl:watch)
2. Target content URLs (instagram.com/p/, tiktok.com/.../video/) not profiles
3. Add keywords like "review", "experience", "complaint" to filter for feedback
4. Use OR operators to broaden social media searches
5. Keep queries under 200 characters

Generate 3-5 queries per platform that will find actual user-generated content.`,
      temperature: 0.3, // Slightly higher for creative query generation
      maxTokens: 2000,
    });

    console.log(`[AI Query Optimizer] Generated ${result.data.queries.length} optimized queries`);

    // Log sample queries for debugging
    if (result.data.queries.length > 0) {
      console.log(`[AI Query Optimizer] Sample queries:`);
      result.data.queries.slice(0, 3).forEach((q, idx) => {
        console.log(`  ${idx + 1}. [${q.platform}] ${q.query}`);
      });
    }

    return result.data.queries;
  } catch (error) {
    console.error(`[AI Query Optimizer Error] ${error instanceof Error ? error.message : "Unknown error"}`);

    // Fallback to improved hardcoded queries if AI fails
    return generateImprovedFallbackQueries(context);
  }
}

/**
 * Builds the query optimization prompt
 */
function getIndustryPlatformHints(industry?: string): string[] {
  const normalizedIndustry = industry?.toLowerCase() ?? "";

  if (/(hotel|hospitality|travel|tourism|resort)/.test(normalizedIndustry)) {
    return ["Booking.com", "Agoda", "Tripadvisor", "Google Maps"];
  }
  if (/(restaurant|food|cafe|dining)/.test(normalizedIndustry)) {
    return ["Google Maps", "Yelp", "Tripadvisor", "Zomato"];
  }
  if (/(software|saas|technology|app)/.test(normalizedIndustry)) {
    return ["G2", "Capterra", "Trustpilot", "app stores"];
  }

  return ["Trustpilot", "Google Maps", "Reddit", "relevant industry marketplaces"];
}

function addIndustryFallbackQueries(queries: OptimizedQuery[], context: ProfileMatchingContext): void {
  const name = context.companyName;
  const industry = context.industry?.toLowerCase() ?? "";

  if (/(hotel|hospitality|travel|tourism|resort)/.test(industry)) {
    queries.push(
      { query: `site:booking.com "${name}" (review OR reviews OR guest experience)`, platform: "generic_web", reasoning: "Booking.com guest review pages for a hospitality business", expectedResultType: "review_page" },
      { query: `site:agoda.com "${name}" (review OR reviews OR guest experience)`, platform: "generic_web", reasoning: "Agoda guest review pages for a hospitality business", expectedResultType: "review_page" },
      { query: `site:tripadvisor.com "${name}" (review OR reviews)`, platform: "generic_web", reasoning: "Tripadvisor traveler reviews for a hospitality business", expectedResultType: "review_page" }
    );
  }
}
function buildQueryOptimizationPrompt(
  context: ProfileMatchingContext,
  platforms: string[]
): string {
  const companyName = context.companyName;
  const domain = context.domain;
  const industry = context.industry;

  const industryPlatformHints = getIndustryPlatformHints(industry);

  let prompt = `Generate optimized Google/Serper search queries to find customer reviews, complaints, and feedback about "${companyName}".

Company Details:
- Name: ${companyName}`;

  if (domain) {
    prompt += `\n- Domain: ${domain}`;
  }

  if (industry) {
    prompt += `\n- Industry: ${industry}`;
  }

  if (context.locations && context.locations.length > 0) {
    prompt += `\n- Locations: ${context.locations.map(l => l.city).join(", ")}`;
  }

  prompt += `\n\nPlatforms to target: ${platforms.includes("all") ? "All platforms" : platforms.join(", ")}

Requirements:
1. Generate queries that find SPECIFIC POSTS/VIDEOS/THREADS, not profile pages
2. For social media, use inurl: filters to target content URLs
3. For review platforms, target company-specific review pages
4. Add sentiment keywords (review, complaint, experience, issue) to filter for feedback
5. Prefer industry-specific review sites: ${industryPlatformHints.join(", ")}
6. For social results, target public post/reel/video URLs from the company's official account, never the profile URL itself
7. Each query should return 5-10 highly relevant URLs

Generate 15-20 total queries covering:
- Review platforms (Trustpilot, Yelp, Google Maps, G2, Capterra)
- Reddit threads (specific discussions)
- Social media posts (Instagram posts/reels, TikTok videos, YouTube videos)
- App store reviews (if applicable)

Focus on finding CONTENT WITH COMMENTS/REVIEWS, not just brand mentions.`;

  return `${prompt}\n\nReturn exactly this JSON object shape (do not return a bare array):
{
  "queries": [{
    "query": "string",
    "platform": "string",
    "reasoning": "string",
    "expectedResultType": "review_page | forum_thread | social_post | video_with_comments | app_reviews"
  }],
  "totalQueries": 1
}
Set totalQueries to the exact number of entries in queries.`;
}

/**
 * Improved fallback queries when AI fails
 */
function generateImprovedFallbackQueries(context: ProfileMatchingContext): OptimizedQuery[] {
  const name = context.companyName;
  const domain = context.domain;
  const queries: OptimizedQuery[] = [];

  // Review Platforms (proven to work)
  queries.push({
    query: `site:trustpilot.com/review "${name}"`,
    platform: "trustpilot",
    reasoning: "Trustpilot review page with company reviews",
    expectedResultType: "review_page",
  });

  if (domain) {
    queries.push({
      query: `site:trustpilot.com/review "${domain}"`,
      platform: "trustpilot",
      reasoning: "Trustpilot review page using domain",
      expectedResultType: "review_page",
    });
  }

  // Reddit (specific threads)
  queries.push({
    query: `site:reddit.com/r/ "${name}" inurl:comments`,
    platform: "reddit",
    reasoning: "Reddit threads with discussions (not just profile mentions)",
    expectedResultType: "forum_thread",
  });

  queries.push({
    query: `site:reddit.com "${name}" (review OR experience OR complaint OR issue)`,
    platform: "reddit",
    reasoning: "Reddit discussions with feedback-related keywords",
    expectedResultType: "forum_thread",
  });

  // Instagram (posts and reels, NOT profiles)
  queries.push({
    query: `site:instagram.com/p/ "${name}"`,
    platform: "instagram",
    reasoning: "Instagram posts mentioning the company",
    expectedResultType: "social_post",
  });

  queries.push({
    query: `site:instagram.com/reel/ "${name}"`,
    platform: "instagram",
    reasoning: "Instagram reels mentioning the company",
    expectedResultType: "social_post",
  });

  // TikTok (videos with comments, NOT profiles)
  queries.push({
    query: `site:tiktok.com "${name}" inurl:video`,
    platform: "tiktok",
    reasoning: "TikTok videos mentioning the company",
    expectedResultType: "video_with_comments",
  });

  queries.push({
    query: `site:tiktok.com "${name}" (review OR experience OR unboxing)`,
    platform: "tiktok",
    reasoning: "TikTok videos with review-related content",
    expectedResultType: "video_with_comments",
  });

  // YouTube (videos with comments, NOT channels)
  queries.push({
    query: `site:youtube.com/watch "${name}" review`,
    platform: "youtube",
    reasoning: "YouTube review videos",
    expectedResultType: "video_with_comments",
  });

  queries.push({
    query: `site:youtube.com "${name}" inurl:watch (review OR unboxing OR experience)`,
    platform: "youtube",
    reasoning: "YouTube videos with feedback",
    expectedResultType: "video_with_comments",
  });

  // Twitter/X (specific tweets, NOT profiles)
  queries.push({
    query: `site:twitter.com "${name}" inurl:status`,
    platform: "twitter",
    reasoning: "Specific tweets mentioning the company",
    expectedResultType: "social_post",
  });

  queries.push({
    query: `site:x.com "${name}" (issue OR complaint OR problem OR disappointed)`,
    platform: "twitter",
    reasoning: "Tweets with negative feedback",
    expectedResultType: "social_post",
  });

  // Facebook (posts, NOT profiles)
  queries.push({
    query: `site:facebook.com "${name}" inurl:posts`,
    platform: "facebook",
    reasoning: "Facebook posts mentioning the company",
    expectedResultType: "social_post",
  });

  queries.push({
    query: `site:facebook.com "${name}" (review OR experience OR complaint)`,
    platform: "facebook",
    reasoning: "Facebook posts with feedback",
    expectedResultType: "social_post",
  });

  // App Stores
  queries.push({
    query: `site:apps.apple.com/app "${name}"`,
    platform: "app_store",
    reasoning: "Apple App Store page with reviews",
    expectedResultType: "app_reviews",
  });

  queries.push({
    query: `site:play.google.com/store/apps/details "${name}"`,
    platform: "play_store",
    reasoning: "Google Play Store page with reviews",
    expectedResultType: "app_reviews",
  });

  // Yelp (location-based if available)
  if (context.locations && context.locations.length > 0) {
    for (const loc of context.locations.slice(0, 2)) {
      queries.push({
        query: `site:yelp.com/biz "${name}" "${loc.city}"`,
        platform: "yelp",
        reasoning: `Yelp business page in ${loc.city}`,
        expectedResultType: "review_page",
      });
    }
  } else {
    queries.push({
      query: `site:yelp.com/biz "${name}"`,
      platform: "yelp",
      reasoning: "Yelp business page with reviews",
      expectedResultType: "review_page",
    });
  }

  // Google Maps
  queries.push({
    query: `"${name}" reviews site:maps.google.com`,
    platform: "google_maps",
    reasoning: "Google Maps reviews",
    expectedResultType: "review_page",
  });

  addIndustryFallbackQueries(queries, context);
  return queries.slice(0, 20);
}

/**
 * Maps optimized queries to the SearchQuery format used by providers
 */
export function mapToSearchQueries(
  optimizedQueries: OptimizedQuery[]
): SearchQuery[] {
  return optimizedQueries.map(q => ({
    term: q.query,
    platform: q.platform as SourceType | undefined, // Cast platform string to SourceType
  }));
}
