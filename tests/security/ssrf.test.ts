import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  validateUrlForScraping,
  validateRedirectTarget,
  MAX_URL_LENGTH,
} from "../../src/lib/security/ssrf";

vi.mock("dns/promises", () => ({
  default: {
    lookup: vi.fn(),
  },
  lookup: vi.fn(),
}));

import dns from "dns/promises";

describe("SSRF Security Validation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("Syntax and Length", () => {
    it("should reject invalid URLs", async () => {
      const result = await validateUrlForScraping("not-a-url");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid URL syntax");
    });

    it("should reject URLs that exceed max length", async () => {
      const tooLongUrl = `http://example.com/${"a".repeat(MAX_URL_LENGTH)}`;
      const result = await validateUrlForScraping(tooLongUrl);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("length");
    });
  });

  describe("Protocol Restriction", () => {
    it("should allow HTTP and HTTPS", async () => {
      (dns.lookup as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([{ address: "93.184.216.34" }]);
      const httpRes = await validateUrlForScraping("http://example.com");
      expect(httpRes.valid).toBe(true);

      const httpsRes = await validateUrlForScraping("https://example.com");
      expect(httpsRes.valid).toBe(true);
    });

    it("should block unsupported protocols like ftp, file, gopher, and data", async () => {
      const gopher = await validateUrlForScraping("gopher://example.com");
      expect(gopher.valid).toBe(false);

      const file = await validateUrlForScraping("file:///etc/passwd");
      expect(file.valid).toBe(false);
    });
  });

  describe("Direct IP Subnet Defenses", () => {
    it("should block direct IPv4 localhost (127.0.0.1)", async () => {
      const result = await validateUrlForScraping("http://127.0.0.1");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("private, loopback, or reserved");
    });

    it("should block direct IPv6 localhost (::1)", async () => {
      const result = await validateUrlForScraping("http://[::1]");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("private, loopback, or reserved");
    });

    it("should block RFC 1918 Private Ranges (10.0.0.0, 172.16.0.0, 192.168.0.0)", async () => {
      expect((await validateUrlForScraping("http://10.1.2.3")).valid).toBe(false);
      expect((await validateUrlForScraping("http://192.168.1.100")).valid).toBe(false);
      expect((await validateUrlForScraping("http://172.20.0.1")).valid).toBe(false);
    });

    it("should block Cloud Metadata Endpoints (169.254.169.254)", async () => {
      const result = await validateUrlForScraping("http://169.254.169.254/latest/meta-data/");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("blocked");
    });
  });

  describe("Resolving Hostname Defenses (DNS Rebinding)", () => {
    it("should block hostnames that resolve to localhost", async () => {
      (dns.lookup as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
        { address: "93.184.216.34" },
        { address: "127.0.0.1" }, // Malicious resolution alongside public IP
      ]);

      const result = await validateUrlForScraping("http://malicious.example.com");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("resolved to prohibited");
    });

    it("should allow hostnames containing only public IP resolutions", async () => {
      (dns.lookup as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([{ address: "93.184.216.34" }]);
      const result = await validateUrlForScraping("http://example.com");
      expect(result.valid).toBe(true);
    });
  });

  describe("Redirect Validation", () => {
    it("should test relative redirect targets against same SSRF rules", async () => {
      (dns.lookup as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([{ address: "93.184.216.34" }]);

      const currentUrl = "http://example.com";
      const result = await validateRedirectTarget(currentUrl, "/page-2");
      expect(result.valid).toBe(true);
      expect(result.targetUrl).toBe("http://example.com/page-2");
    });

    it("should block redirecting to a local resource", async () => {
      (dns.lookup as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([{ address: "127.0.0.1" }]);

      const result = await validateRedirectTarget("http://example.com", "http://internal-service.local");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("internal hostname");
    });

    it("should enforce maximum redirect counts", async () => {
      const result = await validateRedirectTarget("http://example.com", "/next", Array(5).fill("hop"), 5);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("limit");
    });
  });
});
