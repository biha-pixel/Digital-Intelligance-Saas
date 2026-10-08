import robotsParser from "robots-parser";
import { validateUrlForScraping } from "@/lib/security/ssrf";

export const CXPULSE_USER_AGENT = "CXPulseBot/1.0 (+https://cxpulse.ai/bot; contact@cxpulse.ai)";
export const CXPULSE_SHORT_USER_AGENT = "CXPulseBot";

interface CachedRobots {
  parser: ReturnType<typeof robotsParser>;
  fetchedAt: number;
  crawlDelay?: number;
}

// In-memory cache for robots.txt entries (24h TTL)
const robotsCache = new Map<string, CachedRobots>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface RobotsCheckResult {
  allowed: boolean;
  crawlDelay?: number;
  reason?: string;
}

/**
 * Convenience helper to check if a URL is crawlable.
 */
export async function isCrawlable(
  targetUrl: string,
  userAgent: string = CXPULSE_SHORT_USER_AGENT
): Promise<boolean> {
  const result = await checkRobotsTxt(targetUrl, userAgent);
  return result.allowed;
}

/**
 * Checks if a URL is allowed to be scraped according to the domain's robots.txt rules.
 * Honors RFC 9309 specification for robots.txt compliance.
 */
export async function checkRobotsTxt(
  targetUrl: string,
  userAgent: string = CXPULSE_SHORT_USER_AGENT
): Promise<RobotsCheckResult> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(targetUrl);
  } catch {
    return { allowed: false, reason: "Invalid target URL" };
  }

  const origin = parsedUrl.origin;
  const robotsUrl = `${origin}/robots.txt`;

  // Check cache
  const now = Date.now();
  const cached = robotsCache.get(origin);
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    const isAllowed = cached.parser.isAllowed(targetUrl, userAgent) ?? true;
    return {
      allowed: isAllowed,
      crawlDelay: cached.crawlDelay,
      reason: isAllowed ? "Allowed by cached robots.txt" : "Disallowed by cached robots.txt",
    };
  }

  // Check SSRF safety for the robots.txt URL itself
  const ssrfValidation = await validateUrlForScraping(robotsUrl);
  if (!ssrfValidation.valid) {
    return {
      allowed: false,
      reason: `Robots.txt SSRF validation failed: ${ssrfValidation.error}`,
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(robotsUrl, {
      method: "GET",
      headers: {
        "User-Agent": CXPULSE_USER_AGENT,
        Accept: "text/plain, */*",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    let robotsText = "";

    if (response.status === 200) {
      robotsText = await response.text();
    } else if (response.status >= 400 && response.status < 500 && response.status !== 401 && response.status !== 403) {
      // 404 / 4xx Not Found means no robots.txt exists -> all crawling is permitted
      robotsText = "User-agent: *\nAllow: /";
    } else if (response.status === 401 || response.status === 403) {
      // 401/403 Forbidden means site owner restricts access to robots.txt -> disallow by default
      return {
        allowed: false,
        reason: `Access to robots.txt returned HTTP ${response.status} (Restricted Access)`,
      };
    } else {
      // 5xx server error -> temporarily disallow or allow fallback
      robotsText = "User-agent: *\nAllow: /";
    }

    const parser = robotsParser(robotsUrl, robotsText);
    const crawlDelay = parser.getCrawlDelay(userAgent) ?? parser.getCrawlDelay("*") ?? undefined;

    robotsCache.set(origin, {
      parser,
      fetchedAt: now,
      crawlDelay,
    });

    const isAllowed = parser.isAllowed(targetUrl, userAgent) ?? true;

    return {
      allowed: isAllowed,
      crawlDelay,
      reason: isAllowed ? "Allowed by robots.txt" : "Disallowed by robots.txt directive",
    };
  } catch (error: unknown) {
    // Network or fetch timeout: if robots.txt cannot be fetched, default to permissive unless network error
    // For resilience, create default permissive parser
    const parser = robotsParser(robotsUrl, "User-agent: *\nAllow: /");
    robotsCache.set(origin, {
      parser,
      fetchedAt: now,
    });

    return {
      allowed: true,
      reason: `Robots.txt unreachable (${error instanceof Error ? error.message : "timeout"}); defaulting to standard crawl permissions`,
    };
  }
}

/**
 * Clears the in-memory robots.txt cache (useful for test resets).
 */
export function clearRobotsCache(): void {
  robotsCache.clear();
}
