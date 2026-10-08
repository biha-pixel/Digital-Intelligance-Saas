import { canonicalizeUrl } from "@/lib/discovery/utils";

/**
 * Interface for Redirect Resolver Abstraction
 */
export interface RedirectResolver {
  resolveRedirects(
    url: string
  ): Promise<{ canonicalUrl: string; redirectChain: string[]; finalUrl: string }>;
}

/**
 * Default In-Memory / Rule-Based Redirect Resolver
 * Supports known URL mappings and deterministic mock redirects for testing.
 */
export class StaticRedirectResolver implements RedirectResolver {
  private customMappings: Map<string, string[]>;

  constructor(customMappings?: Record<string, string[]>) {
    this.customMappings = new Map();
    if (customMappings) {
      for (const [from, chain] of Object.entries(customMappings)) {
        this.customMappings.set(canonicalizeUrl(from), chain.map(canonicalizeUrl));
      }
    }
  }

  public registerRedirect(fromUrl: string, destinationChain: string[]) {
    this.customMappings.set(
      canonicalizeUrl(fromUrl),
      destinationChain.map(canonicalizeUrl)
    );
  }

  async resolveRedirects(
    rawUrl: string
  ): Promise<{ canonicalUrl: string; redirectChain: string[]; finalUrl: string }> {
    const canonicalInput = canonicalizeUrl(rawUrl);
    const chain = this.customMappings.get(canonicalInput);

    if (chain && chain.length > 0) {
      const finalUrl = chain[chain.length - 1];
      const canonicalFinal = canonicalizeUrl(finalUrl);
      return {
        canonicalUrl: canonicalFinal,
        redirectChain: [canonicalInput, ...chain],
        finalUrl,
      };
    }

    // Default: no redirects observed
    return {
      canonicalUrl: canonicalInput,
      redirectChain: [canonicalInput],
      finalUrl: canonicalInput,
    };
  }
}

/**
 * Deep Canonicalization for Platform-Specific URLs
 */
export function deepCanonicalizeUrl(rawUrl: string): string {
  const baseCanonical = canonicalizeUrl(rawUrl);

  try {
    const parsed = new URL(baseCanonical);
    const host = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname;

    // 1. Trustpilot: https://trustpilot.com/review/acme.com
    if (host.includes("trustpilot.com") && pathname.includes("/review/")) {
      const cleanPath = pathname.replace(/\/+$/, "");
      return `https://trustpilot.com${cleanPath}`;
    }

    // 2. Yelp: https://yelp.com/biz/acme-downtown
    if (host.includes("yelp.com") && pathname.includes("/biz/")) {
      const cleanPath = pathname.replace(/\/+$/, "");
      return `https://yelp.com${cleanPath}`;
    }

    // 3. G2: https://g2.com/products/acme/reviews
    if (host.includes("g2.com") && pathname.includes("/products/")) {
      const cleanPath = pathname.replace(/\/+$/, "");
      return `https://g2.com${cleanPath}`;
    }

    // 4. Reddit: https://reddit.com/r/technology
    if (host.includes("reddit.com") && pathname.includes("/r/")) {
      const cleanPath = pathname.replace(/\/+$/, "");
      return `https://reddit.com${cleanPath}`;
    }

    // 5. App Store
    if (host.includes("apps.apple.com")) {
      const cleanPath = pathname.replace(/\/+$/, "");
      return `https://apps.apple.com${cleanPath}`;
    }

    // 6. Play Store
    if (host.includes("play.google.com") && pathname.includes("/store/apps/details")) {
      const id = parsed.searchParams.get("id");
      if (id) {
        return `https://play.google.com/store/apps/details?id=${id}`;
      }
    }

    return baseCanonical;
  } catch {
    return baseCanonical;
  }
}
