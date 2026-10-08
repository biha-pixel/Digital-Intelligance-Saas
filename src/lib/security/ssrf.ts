import dns from "dns/promises";
import net from "net";

/**
 * Maximum allowed URL length to prevent buffer exhaustion and ReDoS attacks (RFC 7230 / browser standard).
 */
export const MAX_URL_LENGTH = 2048;

/**
 * Maximum allowed redirects to prevent infinite redirect loops and resource starvation.
 */
export const MAX_REDIRECT_LIMIT = 5;

/**
 * Checks whether an IPv4 address belongs to a private, loopback, link-local,
 * cloud metadata, or reserved subnet.
 */
export function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true; // Malformed IPs treated as unsafe
  }

  const [a, b] = parts;

  // 0.0.0.0/8 (Current network)
  if (a === 0) return true;

  // 10.0.0.0/8 (RFC 1918 Private)
  if (a === 10) return true;

  // 100.64.0.0/10 (Shared Address Space / CGNAT)
  if (a === 100 && b >= 64 && b <= 127) return true;

  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;

  // 169.254.0.0/16 (Link-Local & Cloud Instance Metadata e.g. AWS/GCP 169.254.169.254)
  if (a === 169 && b === 254) return true;

  // 172.16.0.0/12 (RFC 1918 Private)
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 192.0.0.0/24 (IETF Protocol Assignments)
  if (a === 192 && b === 0 && parts[2] === 0) return true;

  // 192.0.2.0/24 (Documentation TEST-NET-1)
  if (a === 192 && b === 0 && parts[2] === 2) return true;

  // 192.168.0.0/16 (RFC 1918 Private)
  if (a === 192 && b === 168) return true;

  // 198.18.0.0/15 (Benchmarking)
  if (a === 198 && (b === 18 || b === 19)) return true;

  // 198.51.100.0/24 (Documentation TEST-NET-2)
  if (a === 198 && b === 51 && parts[2] === 100) return true;

  // 203.0.113.0/24 (Documentation TEST-NET-3)
  if (a === 203 && b === 0 && parts[2] === 113) return true;

  // 224.0.0.0/4 (Multicast)
  if (a >= 224 && a <= 239) return true;

  // 240.0.0.0/4 (Reserved / Future Use & Broadcast 255.255.255.255)
  if (a >= 240) return true;

  return false;
}

/**
 * Checks whether an IPv6 address belongs to a loopback, unique-local, link-local,
 * IPv4-mapped, multicast, or documentation subnet.
 */
export function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();

  // Loopback (::1) and Unspecified (::)
  if (
    normalized === "::1" ||
    normalized === "::" ||
    normalized === "0000:0000:0000:0000:0000:0000:0000:0001" ||
    normalized === "0000:0000:0000:0000:0000:0000:0000:0000"
  ) {
    return true;
  }

  // IPv4-mapped IPv6 (::ffff:x.x.x.x or ::ffff:xxxx:xxxx)
  if (
    normalized.startsWith("::ffff:") ||
    normalized.startsWith("0000:0000:0000:0000:0000:ffff:")
  ) {
    const ipv4Part = normalized.replace(/^.*ffff:/, "");
    if (net.isIPv4(ipv4Part)) {
      return isPrivateIPv4(ipv4Part);
    }
    return true;
  }

  // Unique Local Address fc00::/7 (fc00:: - fdff::)
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) {
    return true;
  }

  // Link-Local Address fe80::/10
  if (
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb")
  ) {
    return true;
  }

  // Multicast ff00::/8
  if (normalized.startsWith("ff")) {
    return true;
  }

  // Documentation 2001:db8::/32
  if (
    normalized.startsWith("2001:db8:") ||
    normalized.startsWith("2001:0db8:")
  ) {
    return true;
  }

  return false;
}

/**
 * Returns true if the given IP address is private, loopback, link-local, or reserved.
 */
export function isPrivateOrReservedIp(ip: string): boolean {
  const version = net.isIP(ip);
  if (version === 4) {
    return isPrivateIPv4(ip);
  } else if (version === 6) {
    return isPrivateIPv6(ip);
  }
  // If not recognized as valid IP, treat as unsafe
  return true;
}

export type SSRFValidationResult =
  | {
      valid: true;
      normalizedUrl: string;
      resolvedIps?: string[];
      error?: never;
    }
  | {
      valid: false;
      error: string;
      resolvedIps?: string[];
      normalizedUrl?: never;
    };

/**
 * Strictly validates a URL to prevent Server-Side Request Forgery (SSRF) and DNS rebinding attacks.
 * Verifies:
 * 1. URL length is within bounds (<= 2048 chars)
 * 2. Protocol is strictly http: or https:
 * 3. URL format contains no embedded credentials
 * 4. Destination port is in the allowed scraping port list
 * 5. Hostname is not a local name or blacklisted domain
 * 6. Direct IP addresses are checked against private/reserved subnets
 * 7. Resolves DNS records and verifies that EVERY resolved IP address is a public, non-reserved address
 */
export async function validateUrlForScraping(
  urlString: string
): Promise<SSRFValidationResult> {
  if (!urlString || typeof urlString !== "string") {
    return { valid: false, error: "URL must be a non-empty string" };
  }

  // 1. Length enforcement
  if (urlString.length > MAX_URL_LENGTH) {
    return {
      valid: false,
      error: `URL length (${urlString.length}) exceeds maximum allowed length of ${MAX_URL_LENGTH} characters.`,
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return { valid: false, error: "Invalid URL syntax" };
  }

  // 2. Strict protocol whitelist (HTTP & HTTPS only)
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      valid: false,
      error: `Disallowed protocol "${parsed.protocol}". Only HTTP and HTTPS are permitted for scraping.`,
    };
  }

  // 3. Reject credentials in URL (user:pass@host)
  if (parsed.username || parsed.password) {
    return {
      valid: false,
      error: "URLs containing authentication credentials are not permitted.",
    };
  }

  // 4. Reject ports commonly used for internal services (e.g. database ports, redis, ssh)
  if (parsed.port) {
    const port = parseInt(parsed.port, 10);
    const allowedStandardPorts = [80, 443, 8080, 8443];
    if (!allowedStandardPorts.includes(port)) {
      return {
        valid: false,
        error: `Port ${port} is not in the allowed scraping port list (80, 443, 8080, 8443).`,
      };
    }
  }

  const hostname = parsed.hostname.toLowerCase();
  const cleanHostname = hostname.replace(/^\[|\]$/g, "");

  // 5. Blacklist specific local and cloud metadata hostnames
  const localHostnames = [
    "localhost",
    "localhost.localdomain",
    "ip6-localhost",
    "ip6-loopback",
    "metadata.google.internal",
    "metadata.aws.internal",
    "instance-data",
    "169.254.169.254",
    "host.docker.internal",
    "gateway.docker.internal",
  ];

  if (
    localHostnames.includes(cleanHostname) ||
    cleanHostname.endsWith(".localhost") ||
    cleanHostname.endsWith(".local") ||
    cleanHostname.endsWith(".internal") ||
    cleanHostname.endsWith(".onion")
  ) {
    return {
      valid: false,
      error: `Access to internal hostname "${hostname}" is blocked.`,
    };
  }

  // 6. If hostname is already a direct IP address, validate directly
  if (net.isIP(cleanHostname)) {
    if (isPrivateOrReservedIp(cleanHostname)) {
      return {
        valid: false,
        error: `IP address "${hostname}" belongs to a private, loopback, or reserved subnet.`,
        resolvedIps: [cleanHostname],
      };
    }
    return {
      valid: true,
      resolvedIps: [cleanHostname],
      normalizedUrl: parsed.toString(),
    };
  }

  // 7. Perform DNS lookup for public hostname to prevent DNS rebinding
  try {
    const lookupResults = await dns.lookup(cleanHostname, {
      all: true,
      verbatim: true,
    });

    if (!lookupResults || lookupResults.length === 0) {
      return {
        valid: false,
        error: `Could not resolve hostname "${hostname}" through DNS.`,
      };
    }

    const resolvedIps = lookupResults.map((r) => r.address);

    for (const ip of resolvedIps) {
      if (isPrivateOrReservedIp(ip)) {
        return {
          valid: false,
          error: `Hostname "${hostname}" resolved to prohibited private or reserved IP address "${ip}".`,
          resolvedIps,
        };
      }
    }

    return {
      valid: true,
      resolvedIps,
      normalizedUrl: parsed.toString(),
    };
  } catch (dnsError: unknown) {
    return {
      valid: false,
      error: `DNS resolution failed for hostname "${hostname}": ${
        dnsError instanceof Error ? dnsError.message : "Lookup failed"
      }`,
    };
  }
}

/**
 * Re-validates a redirect target against SSRF rules before following the redirect.
 * Handles both relative and absolute redirect URLs and enforces maximum redirect limits.
 */
export async function validateRedirectTarget(
  currentUrl: string,
  redirectLocation: string,
  redirectChain: string[] = [],
  maxRedirects: number = MAX_REDIRECT_LIMIT
): Promise<SSRFValidationResult & { targetUrl?: string }> {
  if (redirectChain.length >= maxRedirects) {
    return {
      valid: false,
      error: `Maximum redirect limit of ${maxRedirects} exceeded.`,
    };
  }

  let resolvedTarget: string;
  try {
    // Resolve relative redirects against current URL
    const resolved = new URL(redirectLocation, currentUrl);
    resolvedTarget = resolved.toString();
  } catch {
    return {
      valid: false,
      error: `Invalid redirect location "${redirectLocation}".`,
    };
  }

  // Re-run full SSRF validation on the target location
  const ssrfResult = await validateUrlForScraping(resolvedTarget);
  if (!ssrfResult.valid) {
    return {
      valid: false,
      error: `Redirect to unsafe destination blocked: ${ssrfResult.error}`,
    };
  }

  return {
    valid: true,
    normalizedUrl: ssrfResult.normalizedUrl,
    resolvedIps: ssrfResult.resolvedIps,
    targetUrl: ssrfResult.normalizedUrl,
  };
}
