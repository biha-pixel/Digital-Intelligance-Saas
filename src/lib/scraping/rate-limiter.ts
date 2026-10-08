/**
 * Domain-specific rate limiting to enforce polite, ethical web scraping.
 * Guarantees a minimum inter-request delay per target domain.
 */

// Domain minimum inter-request delay in milliseconds
export const DEFAULT_MIN_INTERVAL_MS = 5000; // 5 seconds default

export const PLATFORM_MIN_INTERVALS_MS: Record<string, number> = {
  "trustpilot.com": 10000,
  "google.com": 15000,
  "maps.google.com": 15000,
  "yelp.com": 12000,
  "g2.com": 10000,
  "capterra.com": 10000,
  "reddit.com": 5000,
};

// Map of domain -> timestamp (epoch ms) when the domain is next free to be scraped
const domainNextAvailableTime = new Map<string, number>();

/**
 * Extracts a normalized hostname/domain key from a URL or raw domain.
 */
export function extractDomainKey(urlOrDomain: string): string {
  try {
    if (urlOrDomain.startsWith("http://") || urlOrDomain.startsWith("https://")) {
      const url = new URL(urlOrDomain);
      return url.hostname.toLowerCase().replace(/^www\./, "");
    }
    return urlOrDomain.toLowerCase().replace(/^www\./, "");
  } catch {
    return urlOrDomain.toLowerCase();
  }
}

/**
 * Returns the configured minimum interval in ms for a given domain.
 */
export function getDomainMinInterval(domain: string): number {
  const normalized = extractDomainKey(domain);

  for (const [platformDomain, interval] of Object.entries(PLATFORM_MIN_INTERVALS_MS)) {
    if (normalized === platformDomain || normalized.endsWith(`.${platformDomain}`)) {
      return interval;
    }
  }

  return DEFAULT_MIN_INTERVAL_MS;
}

/**
 * Acquires a rate-limit slot for a target domain.
 * If the domain was contacted recently, this function will asynchronously sleep
 * until the minimum politeness interval has elapsed.
 */
export async function acquireRateLimitSlot(
  urlOrDomain: string,
  customIntervalMs?: number
): Promise<{ waitedMs: number; domain: string }> {
  const domain = extractDomainKey(urlOrDomain);
  const minInterval = customIntervalMs ?? getDomainMinInterval(domain);
  const now = Date.now();

  const nextAvailable = domainNextAvailableTime.get(domain) ?? 0;
  let waitTime = 0;

  if (now < nextAvailable) {
    waitTime = nextAvailable - now;
  }

  // Update next available time for this domain
  const scheduledTime = now + waitTime;
  domainNextAvailableTime.set(domain, scheduledTime + minInterval);

  if (waitTime > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  return { waitedMs: waitTime, domain };
}

/**
 * Checks the current rate limit status for a domain without acquiring a slot.
 */
export function checkRateLimitStatus(urlOrDomain: string): {
  domain: string;
  isRateLimited: boolean;
  remainingWaitMs: number;
} {
  const domain = extractDomainKey(urlOrDomain);
  const now = Date.now();
  const nextAvailable = domainNextAvailableTime.get(domain) ?? 0;
  const remainingWaitMs = Math.max(0, nextAvailable - now);

  return {
    domain,
    isRateLimited: remainingWaitMs > 0,
    remainingWaitMs,
  };
}

/**
 * Resets rate limiter memory state (useful for tests).
 */
export function resetRateLimiter(): void {
  domainNextAvailableTime.clear();
}
