import crypto from "crypto";
import {
  ScrapingProvider,
  ScrapeRequest,
  ScrapeResponse,
  CrawlRequest,
  CrawlResponse,
  HealthCheckResult,
} from "./types";

export class MockScrapingProvider implements ScrapingProvider {
  public readonly name = "MockCrawler";

  public async healthCheck(): Promise<HealthCheckResult> {
    return {
      healthy: true,
      provider: this.name,
      latencyMs: 5,
      message: "Mock scraping provider is healthy",
    };
  }

  public async fetch(request: ScrapeRequest): Promise<ScrapeResponse> {
    const startTime = Date.now();
    const { url } = request;

    // Simulate minor network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    let rawHtml = "";

    if (url.includes("trustpilot.com")) {
      rawHtml = `
        <!DOCTYPE html>
        <html>
          <head><title>Trustpilot Reviews</title></head>
          <body>
            <div class="styles_reviewCard__hcHzC" data-service-review-card-id="tp_rev_1">
              <article>
                <div class="consumer-name" data-consumer-name-typography="true">Jane Doe</div>
                <div data-service-review-rating="5"></div>
                <img alt="Rated 5 out of 5 stars" src="/star-5.svg" />
                <h2 class="review-title" data-service-review-title-typography="true">Life-changing organization tool</h2>
                <p class="review-content__text" data-service-review-text-typography="true">Notion completely changed how our team collaborates. Everything is organized, fast, and intuitive across all our product squads.</p>
                <time datetime="2026-09-01T10:00:00.000Z">Sep 1, 2026</time>
              </article>
            </div>
            <div class="styles_reviewCard__hcHzC" data-service-review-card-id="tp_rev_2">
              <article>
                <div class="consumer-name" data-consumer-name-typography="true">John Smith</div>
                <div data-service-review-rating="1"></div>
                <img alt="Rated 1 out of 5 stars" src="/star-1.svg" />
                <h2 class="review-title" data-service-review-title-typography="true">Terrible billing and buggy performance</h2>
                <p class="review-content__text" data-service-review-text-typography="true">Charged me twice for an enterprise seat and customer support is completely unresponsive. The app keeps crashing and losing my meeting notes. We cancelled our subscription.</p>
                <time datetime="2026-08-15T10:00:00.000Z">Aug 15, 2026</time>
              </article>
            </div>
            <div class="styles_reviewCard__hcHzC" data-service-review-card-id="tp_rev_3">
              <article>
                <div class="consumer-name" data-consumer-name-typography="true">Sarah Jenkins</div>
                <div data-service-review-rating="4"></div>
                <img alt="Rated 4 out of 5 stars" src="/star-4.svg" />
                <h2 class="review-title" data-service-review-title-typography="true">Great for personal notes, slow for team</h2>
                <p class="review-content__text" data-service-review-text-typography="true">I use it for my personal life and it is perfect. But when we tried it at work with 50 people, the database performance degraded significantly, especially on mobile.</p>
                <time datetime="2026-08-01T10:00:00.000Z">Aug 1, 2026</time>
              </article>
            </div>
          </body>
        </html>
      `;
    } else if (url.includes("reddit.com")) {
      rawHtml = `
        <!DOCTYPE html>
        <html>
          <head><title>Reddit Community Discussions</title></head>
          <body>
            <shreddit-post id="t3_reddit_post_1" post-title="Is Notion worth it for high-velocity engineering teams?" author="u/dev_lead" created-timestamp="2026-09-10T12:00:00.000Z" score="150" comment-count="24" subreddit-prefixed-name="r/SaaS">
              <div slot="text-body">We have been using Notion for 6 months now. It is extremely flexible for project roadmaps, but the lack of an authentic offline mode is a major pain point when traveling or during outages.</div>
            </shreddit-post>
            <shreddit-comment thingid="t1_comment_1" author="u/productivity_nerd">
              <div class="usertext-body">I agree. The offline mode is basically non-existent though, which ruined my flight when I tried to review architecture docs.</div>
            </shreddit-comment>
            <shreddit-comment thingid="t1_comment_2" author="u/dev_guy99">
              <div class="usertext-body">The API is getting much better. We integrated it with our internal tools and the webhooks are lightning fast compared to last year.</div>
            </shreddit-comment>
          </body>
        </html>
      `;
    } else {
      rawHtml = `
        <!DOCTYPE html>
        <html>
          <head><title>Customer Reviews & Feedback</title></head>
          <body>
            <blockquote class="testimonial-card" id="test_rev_1">
              <p class="review">Insanely customizable workspace. The database relations and formula properties allow for very dynamic workflows across engineering and product.</p>
              <cite class="author">Alex Miller</cite>
              <span data-rating="5">5 stars</span>
            </blockquote>
            <blockquote class="testimonial-card" id="test_rev_2">
              <p class="review">Critical bug: sync conflicts occur frequently when multiple team members edit the same document simultaneously. Need better real-time conflict resolution.</p>
              <cite class="author">Taylor Wilson</cite>
              <span data-rating="2">2 stars</span>
            </blockquote>
          </body>
        </html>
      `;
    }

    const contentHash = crypto.createHash("sha256").update(rawHtml).digest("hex");
    const executionTimeMs = Date.now() - startTime;

    return {
      url,
      sourceUrl: url,
      statusCode: 200,
      html: rawHtml,
      text: rawHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
      markdown: undefined,
      contentHash,
      fetchedAt: new Date().toISOString(),
      executionTimeMs,
      metadata: {
        statusCode: 200,
        responseTimeMs: executionTimeMs,
        contentType: "text/html",
        title: "Mock Scraped Page",
      },
    };
  }

  public async crawl(request: CrawlRequest): Promise<CrawlResponse> {
    const startTime = Date.now();
    const results: ScrapeResponse[] = [];

    for (const url of request.urls) {
      const res = await this.fetch({ url });
      results.push(res);
    }

    return {
      total: request.urls.length,
      successful: results.length,
      failed: 0,
      results,
      errors: [],
      totalDurationMs: Date.now() - startTime,
    };
  }
}
