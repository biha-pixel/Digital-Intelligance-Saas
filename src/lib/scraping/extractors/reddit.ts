import * as cheerio from "cheerio";
import { SourceType } from "@/types/database.types";
import { BaseExtractor } from "./base";
import { ExtractedFeedback, ExtractionResult } from "../types";

export class ForumRedditExtractor extends BaseExtractor {
  public readonly sourceType: SourceType = "reddit";

  /**
   * Identifies whether a post or comment carries strong complaint indicators.
   */
  private isComplaint(text: string): boolean {
    const lower = text.toLowerCase();
    const complaintPatterns = [
      /\b(scam|fraud|ripoff|rip-off|terrible|horrible|worst|unusable|broken|buggy)\b/,
      /\b(refused|denied)\s+(a\s+)?refund\b/,
      /\b(customer\s+service|support)\s+(is\s+)?(useless|awful|unresponsive|horrible)\b/,
      /\b(charged|billed)\s+(me\s+)?(twice|incorrectly|extra|fraudulently)\b/,
      /\b(cancelled|canceled)\s+my\s+account\b/,
      /\bnever\s+using\s+(them|this)\s+again\b/,
    ];

    return complaintPatterns.some((pattern) => pattern.test(lower));
  }

  public extract(html: string, pageUrl: string): ExtractionResult {
    const $ = cheerio.load(html);
    const items: ExtractedFeedback[] = [];

    // Remove irrelevant chrome and boilerplate
    $(
      "script, style, noscript, nav, header, footer, svg, aside, [id*='sidebar'], [class*='sidebar'], [class*='community-rules'], [data-testid*='subreddit-sidebar']"
    ).remove();

    // 1. Extract Main Post / Submission
    const postContainer = $(
      "shreddit-post, div[data-testid='post-container'], div.Post, div.thing.link, article[data-testid='post']"
    ).first();

    if (postContainer.length > 0) {
      const postId =
        postContainer.attr("id") ||
        postContainer.attr("data-fullname") ||
        postContainer.attr("data-post-id") ||
        postContainer.attr("permalink") ||
        undefined;

      const postTitle =
        postContainer.attr("post-title") ||
        postContainer.find("h1, [slot='title'], [data-testid='post-title']").first().text().trim();

      const postAuthor =
        postContainer.attr("author") ||
        postContainer.find("a[data-testid='post_author_link'], a[href*='/user/'], [class*='author']").first().text().trim() ||
        undefined;

      const postBody =
        postContainer.find("[slot='text-body'], div[data-testid='post-body'], div.usertext-body, div[class*='RichTextJSON-root']").first().text().trim();

      const postTime =
        postContainer.attr("created-timestamp") ||
        postContainer.find("time").first().attr("datetime") ||
        postContainer.find("time").first().text().trim();

      let postedAt: string | undefined;
      if (postTime) {
        try {
          const parsed = new Date(postTime);
          if (!isNaN(parsed.getTime())) {
            postedAt = parsed.toISOString();
          }
        } catch {
          // Ignore
        }
      }

      const combinedText = postTitle && postBody
        ? `${postTitle}\n\n${postBody}`
        : postTitle || postBody;

      // Filter out deleted/moderator notices
      const isClean =
        combinedText &&
        !combinedText.startsWith("[deleted]") &&
        !combinedText.startsWith("[removed]");

      if (isClean && combinedText.length >= 10) {
        const feedback = this.buildFeedbackItem({
          externalId: postId,
          rawAuthorName: postAuthor && postAuthor !== "[deleted]" ? postAuthor : undefined,
          rawAuthorUrl: postAuthor ? `https://reddit.com/user/${postAuthor.replace(/^u\//, "")}` : undefined,
          contentText: combinedText,
          postedAt,
          languageCode: "en",
          feedbackType: this.isComplaint(combinedText) ? "complaint" : "forum_post",
          rawPayload: {
            title: postTitle || undefined,
            score: postContainer.attr("score") || postContainer.find("[data-testid='vote-count'], .score").first().text().trim() || undefined,
            numComments: postContainer.attr("comment-count") || undefined,
            subreddit: postContainer.attr("subreddit-prefixed-name") || undefined,
          },
          metadata: {
            sourceUrl: pageUrl,
            isOriginalPost: true,
            hasTitle: Boolean(postTitle),
          },
        });

        if (feedback) {
          items.push(feedback);
        }
      }
    }

    // 2. Extract Comments
    const commentElements = $(
      "shreddit-comment, div[data-testid='comment'], div.comment, div.thing.comment, div[class*='Comment']"
    );

    commentElements.each((_, el) => {
      const comment = $(el);

      const authorName =
        comment.attr("author") ||
        comment.find("a[href*='/user/'], [data-testid='comment_author_link'], .author").first().text().trim() ||
        undefined;

      // Ignore bots, AutoModerator, deleted
      if (
        !authorName ||
        authorName.toLowerCase() === "automoderator" ||
        authorName.toLowerCase() === "[deleted]" ||
        authorName.toLowerCase() === "[removed]"
      ) {
        return;
      }

      const commentId =
        comment.attr("thingid") ||
        comment.attr("id") ||
        comment.attr("data-comment-id") ||
        undefined;

      const commentBody =
        comment.find("[slot='comment'], div[data-testid='comment-body'], div.usertext-body, div[class*='RichTextJSON-root'], p").first().text().trim();

      if (!commentBody || commentBody === "[deleted]" || commentBody === "[removed]" || commentBody.length < 10) {
        return;
      }

      const commentTime =
        comment.find("time").first().attr("datetime") ||
        comment.find("time").first().text().trim();

      let postedAt: string | undefined;
      if (commentTime) {
        try {
          const parsed = new Date(commentTime);
          if (!isNaN(parsed.getTime())) {
            postedAt = parsed.toISOString();
          }
        } catch {
          // Ignore
        }
      }

      const feedback = this.buildFeedbackItem({
        externalId: commentId,
        rawAuthorName: authorName,
        rawAuthorUrl: `https://reddit.com/user/${authorName.replace(/^u\//, "")}`,
        contentText: commentBody,
        postedAt,
        languageCode: "en",
        feedbackType: this.isComplaint(commentBody) ? "complaint" : "comment",
        rawPayload: {
          score: comment.attr("score") || comment.find(".score").first().text().trim() || undefined,
          depth: comment.attr("depth") || undefined,
        },
        metadata: {
          sourceUrl: pageUrl,
          isComment: true,
        },
      });

      if (feedback) {
        items.push(feedback);
      }
    });

    const pageTitle = $("title").text().trim();

    return {
      sourceType: this.sourceType,
      items: items.slice(0, 50), // Bounded to top 50 relevant items per thread
      pageTitle: pageTitle || undefined,
      totalExtracted: items.length,
    };
  }
}
