import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Crawl4AIProvider } from "../../src/lib/scraping/crawl4ai-client";
import {
  ScrapingTimeoutError,
  ScrapingError,
  SSRFValidationError,
} from "../../src/lib/scraping/errors";

const MOCK_URL = "http://localhost:11235";
const TARGET_URL = "http://example.com";

describe("Crawl4AIProvider", () => {
  let provider: Crawl4AIProvider;

  beforeEach(() => {
    provider = new Crawl4AIProvider({
      baseUrl: MOCK_URL,
      apiToken: "test-token",
    });
    // Mock the global fetch
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("healthCheck", () => {
    it("should return healthy when service returns 200", async () => {
      (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ version: "1.0.0" }),
      });

      const result = await provider.healthCheck();
      expect(result.healthy).toBe(true);
      expect(result.version).toBe("1.0.0");
      expect(global.fetch).toHaveBeenCalledWith(`${MOCK_URL}/health`, expect.any(Object));
    });

    it("should return unhealthy when service returns non-200", async () => {
      (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
      });

      const result = await provider.healthCheck();
      expect(result.healthy).toBe(false);
      expect(result.message).toContain("HTTP 503");
    });

    it("should return unhealthy on fetch exception (e.g. timeout or connect refused)", async () => {
      (global.fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("Connection refused"));

      const result = await provider.healthCheck();
      expect(result.healthy).toBe(false);
      expect(result.message).toBe("Connection refused");
    });
  });

  describe("fetch", () => {
    it("should successfully fetch and return clean content", async () => {
      const mockResponse = {
        results: [
          {
            url: TARGET_URL,
            status_code: 200,
            html: "<html><body>Clean</body></html>",
            text: "Clean",
            metadata: { title: "Test" },
          },
        ],
      };

      (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => mockResponse,
      });

      const result = await provider.fetch({ url: TARGET_URL });

      expect(result.url).toBe(TARGET_URL);
      expect(result.html).toContain("Clean");
      expect(result.contentHash).toBeDefined();
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("should enforce exponential backoff to retry transient errors", async () => {
      (global.fetch as unknown as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: false,
          status: 502,
          text: async () => "Bad Gateway",
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers(),
          json: async () => ({ results: [{ url: TARGET_URL, html: "Success" }] }),
        });

      const result = await provider.fetch({ url: TARGET_URL, maxRetries: 2 });

      expect(result.html).toBe("Success");
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it("should throw a non-retryable error immediately on 403 Forbidden", async () => {
      (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => "Forbidden",
      });

      await expect(provider.fetch({ url: TARGET_URL })).rejects.toThrow(ScrapingError);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("should block SSRF attempts before calling fetch", async () => {
      await expect(provider.fetch({ url: "http://127.0.0.1/admin" })).rejects.toThrow(SSRFValidationError);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("should handle timeout correctly", async () => {
      const abortError = new Error("The operation was aborted");
      abortError.name = "AbortError";
      (global.fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(abortError);

      await expect(provider.fetch({ url: TARGET_URL })).rejects.toThrow(ScrapingTimeoutError);
    });

    it("should handle rate limits (HTTP 429) as retryable", async () => {
      (global.fetch as unknown as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: new Headers({ "retry-after": "1" }),
          text: async () => "Too Many Requests",
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers(),
          json: async () => ({ results: [{ url: TARGET_URL, html: "Success" }] }),
        });

      const result = await provider.fetch({ url: TARGET_URL, maxRetries: 1 });

      expect(result.html).toBe("Success");
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("crawl (batching)", () => {
    it("should orchestrate multiple URLs correctly with error isolation", async () => {
      (global.fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation(async (_url: string, init: RequestInit) => {
        const bodyObj = JSON.parse(init.body as string);
        if (bodyObj.urls === "http://example.com/bad") {
          return {
            ok: false,
            status: 404,
            text: async () => "Not Found",
          };
        }
        return {
          ok: true,
          status: 200,
          headers: new Headers(),
          json: async () => ({
            results: [{ url: bodyObj.urls, html: "Success" }],
          }),
        };
      });

      const result = await provider.crawl({
        urls: ["http://example.com/good", "http://example.com/bad"],
        maxRetries: 0,
      });

      expect(result.total).toBe(2);
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.results[0].url).toBe("http://example.com/good");
      expect(result.errors[0].url).toBe("http://example.com/bad");
      expect(result.errors[0].error).toContain("404");
    });
  });
});
