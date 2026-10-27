import { SourceType } from "@/types/database.types";

/**
 * Platform-Specific Crawl4AI Configuration
 *
 * Each platform requires different wait conditions, selectors, and delays
 * to ensure JavaScript-rendered content is fully loaded before extraction.
 */

export interface PlatformScrapingConfig {
  /**
   * CSS selector to wait for before considering page loaded
   */
  waitForSelector?: string;

  /**
   * Delay in milliseconds before returning content (allows JS to finish)
   */
  delayMs: number;

  /**
   * Whether to enable JavaScript execution (Crawl4AI's "magic" mode)
   */
  jsEnabled: boolean;

  /**
   * Custom user agent for the platform (some sites check this)
   */
  userAgent?: string;

  /**
   * Additional headers to send with the request
   */
  headers?: Record<string, string>;

  /**
   * Whether to bypass cache (useful for always-fresh review data)
   */
  bypassCache: boolean;

  /**
   * Timeout in milliseconds for the entire scrape operation
   */
  timeoutMs: number;

  /**
   * Description of what this config does
   */
  description: string;
}

/**
 * Platform-specific scraping configurations optimized for each review source
 */
export const PLATFORM_SCRAPING_CONFIGS: Record<SourceType, PlatformScrapingConfig> = {
  trustpilot: {
    waitForSelector: 'article[data-service-review-card-id], div[class*="styles_reviewCard"]',
    delayMs: 3000, // Trustpilot loads reviews via JavaScript
    jsEnabled: true,
    bypassCache: true,
    timeoutMs: 45000,
    headers: {
      "Accept-Language": "en-US,en;q=0.9",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    description: "Trustpilot review cards are JavaScript-rendered and require waiting for article elements",
  },

  reddit: {
    waitForSelector: 'shreddit-post, shreddit-comment, div[data-testid="post-container"]',
    delayMs: 4000, // Reddit's new design is heavily JavaScript-based
    jsEnabled: true,
    bypassCache: true,
    timeoutMs: 45000,
    headers: {
      "Accept-Language": "en-US,en;q=0.9",
    },
    description: "Reddit's new design uses custom web components (shreddit-*) that require JS execution",
  },

  google_maps: {
    waitForSelector: 'div[data-review-id], div[jsaction*="review"]',
    delayMs: 5000, // Google Maps reviews load dynamically
    jsEnabled: true,
    bypassCache: true,
    timeoutMs: 60000,
    headers: {
      "Accept-Language": "en-US,en;q=0.9",
    },
    description: "Google Maps reviews are dynamically loaded and require scrolling/interaction simulation",
  },

  yelp: {
    waitForSelector: 'ul[role="list"] li p, div[class*="review"]',
    delayMs: 3000,
    jsEnabled: true,
    bypassCache: true,
    timeoutMs: 45000,
    headers: {
      "Accept-Language": "en-US,en;q=0.9",
    },
    description: "Yelp reviews are partially server-rendered but lazy-load images and metadata",
  },

  g2: {
    waitForSelector: 'div[itemprop="review"], div[class*="review-container"]',
    delayMs: 4000,
    jsEnabled: true,
    bypassCache: true,
    timeoutMs: 45000,
    headers: {
      "Accept-Language": "en-US,en;q=0.9",
    },
    description: "G2 reviews are JavaScript-rendered with lazy loading",
  },

  capterra: {
    waitForSelector: 'div[class*="review"], article[class*="review"]',
    delayMs: 3000,
    jsEnabled: true,
    bypassCache: true,
    timeoutMs: 45000,
    headers: {
      "Accept-Language": "en-US,en;q=0.9",
    },
    description: "Capterra reviews load via JavaScript and require waiting for review containers",
  },

  app_store: {
    waitForSelector: 'div[class*="we-customer-review"]',
    delayMs: 4000,
    jsEnabled: true,
    bypassCache: true,
    timeoutMs: 45000,
    headers: {
      "Accept-Language": "en-US,en;q=0.9",
    },
    description: "App Store reviews are JavaScript-rendered and require full page load",
  },

  play_store: {
    waitForSelector: 'div[jsname], div[data-review-id]',
    delayMs: 5000,
    jsEnabled: true,
    bypassCache: true,
    timeoutMs: 60000,
    headers: {
      "Accept-Language": "en-US,en;q=0.9",
    },
    description: "Google Play Store reviews are dynamically loaded with infinite scroll",
  },

  instagram: {
    waitForSelector: 'article, div[role="button"]',
    delayMs: 5000,
    jsEnabled: true,
    bypassCache: true,
    timeoutMs: 60000,
    description: "Instagram content is dynamically loaded; AI extraction required for captions/comments",
  },

  tiktok: {
    waitForSelector: 'div[data-e2e="search-video-item"], div[data-e2e="comment"]',
    delayMs: 5000,
    jsEnabled: true,
    bypassCache: true,
    timeoutMs: 60000,
    description: "TikTok video descriptions and comments require AI extraction",
  },

  twitter: {
    waitForSelector: 'article[data-testid="tweet"], div[data-testid="tweet"]',
    delayMs: 4000,
    jsEnabled: true,
    bypassCache: true,
    timeoutMs: 45000,
    description: "Twitter/X tweets and threads require AI extraction for sentiment",
  },

  youtube: {
    waitForSelector: 'ytd-comment-renderer, #comments',
    delayMs: 5000,
    jsEnabled: true,
    bypassCache: true,
    timeoutMs: 60000,
    description: "YouTube video comments require AI extraction",
  },

  facebook: {
    waitForSelector: 'div[role="article"], div[role="comment"]',
    delayMs: 5000,
    jsEnabled: true,
    bypassCache: true,
    timeoutMs: 60000,
    description: "Facebook posts and comments require AI extraction",
  },

  generic_web: {
    waitForSelector: undefined, // No specific selector to wait for
    delayMs: 2000,
    jsEnabled: true,
    bypassCache: false,
    timeoutMs: 30000,
    description: "Generic fallback configuration for unknown platforms",
  },
};

/**
 * Get the optimal scraping configuration for a given source type
 */
export function getPlatformConfig(sourceType: SourceType): PlatformScrapingConfig {
  return PLATFORM_SCRAPING_CONFIGS[sourceType] || PLATFORM_SCRAPING_CONFIGS.generic_web;
}

/**
 * Check if a source type requires JavaScript rendering
 */
export function requiresJavaScript(sourceType: SourceType): boolean {
  return getPlatformConfig(sourceType).jsEnabled;
}

/**
 * Get platform-specific request headers
 */
export function getPlatformHeaders(sourceType: SourceType): Record<string, string> {
  return getPlatformConfig(sourceType).headers || {};
}
