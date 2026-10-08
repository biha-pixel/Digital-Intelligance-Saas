import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { z } from "zod";
import {
  OmniRouteAdapter,
  MockAIProvider,
  getAIProvider,
  resetDefaultAIProvider,
  PromptTemplate,
  PromptRegistry,
  calculateBackoffDelay,
  executeWithRetry,
  AIError,
  AITimeoutError,
  AIRateLimitError,
  AIGatewayError,
  AIAuthenticationError,
  AIValidationError,
  AIMalformedResponseError,
  AIInvalidRequestError,
  resolveModelForTier,
  getModelMetadata,
  MODEL_CATALOG,
} from "../../src/lib/ai";

// Sample Zod schema for testing structured intelligence extraction
const TestSentimentAnalysisSchema = z.object({
  sentiment: z.enum(["positive", "neutral", "negative"]),
  score: z.number().min(0).max(1),
  primaryTopic: z.string(),
  urgency: z.enum(["low", "medium", "high", "critical"]),
  actionItems: z.array(z.string()).optional(),
});

type TestSentimentAnalysis = z.infer<typeof TestSentimentAnalysisSchema>;

describe("Phase 10: AI Infrastructure & OmniRoute Integration", () => {
  const originalFetch = global.fetch;
  const originalEnv = process.env;

  beforeEach(() => {
    vi.restoreAllMocks();
    resetDefaultAIProvider();
    PromptRegistry.getInstance().clear();
    process.env = {
      ...originalEnv,
      OMNIROUTE_API_KEY: "test-omniroute-key-123",
      OMNIROUTE_BASE_URL: "https://api.omniroute.ai/v1",
      OMNIROUTE_DEFAULT_MODEL: "anthropic/claude-3-5-sonnet",
      OMNIROUTE_FAST_MODEL: "openai/gpt-4o-mini",
      OMNIROUTE_REASONING_MODEL: "anthropic/claude-3-7-sonnet",
    };
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = originalEnv;
  });

  describe("OmniRouteAdapter - Text Completions", () => {
    it("should successfully execute a valid text completion request", async () => {
      const mockResponsePayload = {
        id: "chatcmpl-test-1",
        object: "chat.completion",
        created: 1728000000,
        model: "anthropic/claude-3-5-sonnet",
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: "This customer is experiencing checkout latency issues.",
            },
            finish_reason: "stop",
          },
        ],
        usage: {
          prompt_tokens: 35,
          completion_tokens: 12,
          total_tokens: 47,
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(mockResponsePayload),
        headers: new Headers(),
      });

      const adapter = new OmniRouteAdapter();
      const response = await adapter.complete({
        messages: [{ role: "user", content: "Analyze this review snippet." }],
        systemPrompt: "You are a customer feedback analyzer.",
        modelTier: "standard",
      });

      expect(response.content).toBe("This customer is experiencing checkout latency issues.");
      expect(response.rawText).toBe("This customer is experiencing checkout latency issues.");
      expect(response.model).toBe("anthropic/claude-3-5-sonnet");
      expect(response.provider).toBe("Anthropic");
      expect(response.usage.promptTokens).toBe(35);
      expect(response.usage.completionTokens).toBe(12);
      expect(response.usage.totalTokens).toBe(47);
      expect(response.finishReason).toBe("stop");
      expect(response.latencyMs).toBeGreaterThanOrEqual(0);

      // Verify fetch call payload
      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [url, requestOptions] = (global.fetch as any).mock.calls[0];
      expect(url).toBe("https://api.omniroute.ai/v1/chat/completions");
      expect(requestOptions.headers.Authorization).toBe("Bearer test-omniroute-key-123");
      const parsedBody = JSON.parse(requestOptions.body);
      expect(parsedBody.model).toBe("anthropic/claude-3-5-sonnet");
      expect(parsedBody.messages[0]).toEqual({
        role: "system",
        content: "You are a customer feedback analyzer.",
      });
      expect(parsedBody.messages[1]).toEqual({
        role: "user",
        content: "Analyze this review snippet.",
      });
    });

    it("should throw AIAuthenticationError when API key is missing", async () => {
      process.env.OMNIROUTE_API_KEY = "";
      const adapter = new OmniRouteAdapter({ apiKey: "" });

      await expect(
        adapter.complete({
          messages: [{ role: "user", content: "Test prompt" }],
        })
      ).rejects.toThrow(AIAuthenticationError);
    });

    it("should map HTTP 401/403 gateway response to AIAuthenticationError without retrying", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({ error: { message: "Invalid API Key" } }),
        headers: new Headers(),
      });

      const adapter = new OmniRouteAdapter();

      await expect(
        adapter.complete({
          messages: [{ role: "user", content: "Hello" }],
          retryConfig: { maxRetries: 3 },
        })
      ).rejects.toThrow(AIAuthenticationError);

      // Fast fail on auth error: should NOT retry
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("should map HTTP 429 response to AIRateLimitError", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => JSON.stringify({ error: { message: "Rate limit exceeded" } }),
        headers: new Headers({ "retry-after": "2" }),
      });

      const adapter = new OmniRouteAdapter();

      await expect(
        adapter.complete({
          messages: [{ role: "user", content: "Hello" }],
          retryConfig: { maxRetries: 0 },
        })
      ).rejects.toThrow(AIRateLimitError);
    });

    it("should map HTTP 500/502/503/504 to AIGatewayError and succeed on subsequent retry", async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return {
            ok: false,
            status: 503,
            text: async () => JSON.stringify({ error: { message: "Service Unavailable" } }),
            headers: new Headers(),
          };
        }
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              choices: [{ message: { content: "Recovered after retry" } }],
              usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
            }),
          headers: new Headers(),
        };
      });

      const adapter = new OmniRouteAdapter();
      const response = await adapter.complete({
        messages: [{ role: "user", content: "Test resilience" }],
        retryConfig: { maxRetries: 2, baseDelayMs: 10, maxDelayMs: 50 },
      });

      expect(callCount).toBe(2);
      expect(response.content).toBe("Recovered after retry");
    });

    it("should handle malformed provider response: empty choices array", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ choices: [] }),
        headers: new Headers(),
      });

      const adapter = new OmniRouteAdapter();
      await expect(
        adapter.complete({
          messages: [{ role: "user", content: "Test prompt" }],
          retryConfig: { maxRetries: 0 },
        })
      ).rejects.toThrow(AIMalformedResponseError);
    });

    it("should handle malformed provider response: non-JSON body payload", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => "<html><head><title>502 Bad Gateway</title></head></html>",
        headers: new Headers(),
      });

      const adapter = new OmniRouteAdapter();
      await expect(
        adapter.complete({
          messages: [{ role: "user", content: "Test prompt" }],
          retryConfig: { maxRetries: 0 },
        })
      ).rejects.toThrow(AIMalformedResponseError);
    });

    it("should handle request timeout with AITimeoutError", async () => {
      global.fetch = vi.fn().mockImplementation(
        (_url: string, options: any) =>
          new Promise((_, reject) => {
            const signal = options.signal as AbortSignal;
            if (signal) {
              signal.addEventListener("abort", () => {
                const err = new Error("The operation was aborted.");
                err.name = "AbortError";
                reject(err);
              });
            }
          })
      );

      const adapter = new OmniRouteAdapter();
      await expect(
        adapter.complete({
          messages: [{ role: "user", content: "Long running prompt" }],
          timeoutMs: 30,
          retryConfig: { maxRetries: 0 },
        })
      ).rejects.toThrow(AITimeoutError);
    });
  });

  describe("OmniRouteAdapter - Structured Output & Schema Validation", () => {
    it("should validate and return valid structured output conforming to Zod schema", async () => {
      const validPayload: TestSentimentAnalysis = {
        sentiment: "negative",
        score: 0.92,
        primaryTopic: "Billing & Subscriptions",
        urgency: "high",
        actionItems: ["Refund overcharged fee", "Fix stripe invoice webhook"],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify(validPayload),
                },
                finish_reason: "stop",
              },
            ],
            usage: { prompt_tokens: 50, completion_tokens: 30, total_tokens: 80 },
          }),
        headers: new Headers(),
      });

      const adapter = new OmniRouteAdapter();
      const response = await adapter.generateStructured({
        messages: [{ role: "user", content: "Analyze customer email" }],
        schema: TestSentimentAnalysisSchema,
        schemaName: "TestSentimentAnalysis",
        modelTier: "standard",
      });

      expect(response.data).toEqual(validPayload);
      expect(response.content.sentiment).toBe("negative");
      expect(response.data.urgency).toBe("high");
      expect(response.data.actionItems).toHaveLength(2);
    });

    it("should strip markdown code fences (```json ... ```) and successfully validate schema", async () => {
      const validPayload: TestSentimentAnalysis = {
        sentiment: "positive",
        score: 0.85,
        primaryTopic: "Product UI",
        urgency: "low",
      };

      const wrappedContent = `\`\`\`json\n${JSON.stringify(validPayload, null, 2)}\n\`\`\``;

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            choices: [{ message: { content: wrappedContent } }],
            usage: { prompt_tokens: 45, completion_tokens: 25, total_tokens: 70 },
          }),
        headers: new Headers(),
      });

      const adapter = new OmniRouteAdapter();
      const response = await adapter.generateStructured({
        messages: [{ role: "user", content: "Analyze feedback" }],
        schema: TestSentimentAnalysisSchema,
        schemaName: "TestSentimentAnalysis",
      });

      expect(response.data.sentiment).toBe("positive");
      expect(response.data.score).toBe(0.85);
    });

    it("should throw AIMalformedResponseError when model returns invalid non-JSON string", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            choices: [
              {
                message: {
                  content: "Sorry, I cannot provide JSON format for this request.",
                },
              },
            ],
          }),
        headers: new Headers(),
      });

      const adapter = new OmniRouteAdapter();
      await expect(
        adapter.generateStructured({
          messages: [{ role: "user", content: "Extract feedback" }],
          schema: TestSentimentAnalysisSchema,
          schemaName: "TestSentimentAnalysis",
          retryConfig: { maxRetries: 0 },
        })
      ).rejects.toThrow(AIMalformedResponseError);
    });

    it("should throw AIValidationError when output is missing a required field", async () => {
      // Missing required field "sentiment" and "urgency"
      const incompletePayload = {
        score: 0.5,
        primaryTopic: "General inquiry",
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            choices: [{ message: { content: JSON.stringify(incompletePayload) } }],
          }),
        headers: new Headers(),
      });

      const adapter = new OmniRouteAdapter();
      const errorPromise = adapter.generateStructured({
        messages: [{ role: "user", content: "Extract data" }],
        schema: TestSentimentAnalysisSchema,
        schemaName: "TestSentimentAnalysis",
        retryConfig: { maxRetries: 0 },
      });

      await expect(errorPromise).rejects.toThrow(AIValidationError);
      try {
        await errorPromise;
      } catch (err: any) {
        expect(err).toBeInstanceOf(AIValidationError);
        const valError = err as AIValidationError;
        expect(valError.code).toBe("VALIDATION_ERROR");
        expect(valError.zodErrors.some((e) => e.path.includes("sentiment"))).toBe(true);
        expect(valError.zodErrors.some((e) => e.path.includes("urgency"))).toBe(true);
      }
    });

    it("should throw AIValidationError when output contains an invalid enum value", async () => {
      // Invalid enum value "catastrophic" instead of ["low", "medium", "high", "critical"]
      const invalidEnumPayload = {
        sentiment: "negative",
        score: 0.99,
        primaryTopic: "Outage",
        urgency: "catastrophic", // Invalid enum!
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            choices: [{ message: { content: JSON.stringify(invalidEnumPayload) } }],
          }),
        headers: new Headers(),
      });

      const adapter = new OmniRouteAdapter();
      const errorPromise = adapter.generateStructured({
        messages: [{ role: "user", content: "Extract data" }],
        schema: TestSentimentAnalysisSchema,
        schemaName: "TestSentimentAnalysis",
        retryConfig: { maxRetries: 0 },
      });

      await expect(errorPromise).rejects.toThrow(AIValidationError);
      try {
        await errorPromise;
      } catch (err: any) {
        expect(err).toBeInstanceOf(AIValidationError);
        const valError = err as AIValidationError;
        expect(valError.zodErrors.some((e) => e.path.includes("urgency"))).toBe(true);
      }
    });
  });

  describe("MockAIProvider - Zero-Egress Offline Testing", () => {
    it("should return enqueued plain text responses and record call history", async () => {
      const mock = new MockAIProvider();
      mock.enqueueResponse("First queued response");
      mock.enqueueResponse({
        content: "Second queued response",
        model: "custom-mock-model",
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      const res1 = await mock.complete({
        messages: [{ role: "user", content: "Call 1" }],
        promptVersion: "prompt-1@v1.0",
      });
      const res2 = await mock.complete({
        messages: [{ role: "user", content: "Call 2" }],
      });

      expect(res1.content).toBe("First queued response");
      expect(res1.promptVersion).toBe("prompt-1@v1.0");
      expect(res2.content).toBe("Second queued response");
      expect(res2.model).toBe("custom-mock-model");
      expect(res2.usage.totalTokens).toBe(150);

      const history = mock.getCallHistory();
      expect(history).toHaveLength(2);
      expect(history[0].request.messages[0].content).toBe("Call 1");
      expect(history[1].request.messages[0].content).toBe("Call 2");
    });

    it("should validate enqueued structured data against schema in MockAIProvider", async () => {
      const mock = new MockAIProvider();
      const validData: TestSentimentAnalysis = {
        sentiment: "neutral",
        score: 0.5,
        primaryTopic: "Documentation",
        urgency: "low",
      };

      mock.enqueueStructuredResponse(validData);

      const response = await mock.generateStructured({
        messages: [{ role: "user", content: "Analyze doc feedback" }],
        schema: TestSentimentAnalysisSchema,
        schemaName: "TestSentimentAnalysis",
      });

      expect(response.data).toEqual(validData);
      expect(response.data.sentiment).toBe("neutral");
      expect(mock.getStructuredCallHistory()).toHaveLength(1);
    });

    it("should throw AIValidationError if enqueued mock structured data violates schema", async () => {
      const mock = new MockAIProvider();
      // Invalid mock data: score exceeds max 1
      const invalidData = {
        sentiment: "positive",
        score: 500, // Invalid!
        primaryTopic: "Test",
        urgency: "low",
      };

      mock.enqueueStructuredResponse(invalidData);

      await expect(
        mock.generateStructured({
          messages: [{ role: "user", content: "Analyze feedback" }],
          schema: TestSentimentAnalysisSchema,
          schemaName: "TestSentimentAnalysis",
        })
      ).rejects.toThrow(AIValidationError);
    });

    it("should simulate latency and throw AITimeoutError when simulated latency exceeds timeoutMs", async () => {
      const mock = new MockAIProvider();
      mock.setSimulatedLatency(50);

      await expect(
        mock.complete({
          messages: [{ role: "user", content: "Quick check" }],
          timeoutMs: 20, // Lower than 50ms simulated latency
        })
      ).rejects.toThrow(AITimeoutError);
    });

    it("should support dynamic custom handlers for complex mock behavior", async () => {
      const mock = new MockAIProvider();
      mock.setCustomHandler(async (req) => ({
        content: `Handled prompt: ${req.messages[0].content}`,
        rawText: `Handled prompt: ${req.messages[0].content}`,
        model: "custom-dynamic-handler",
        provider: "MockDynamic",
        usage: { promptTokens: 5, completionTokens: 5, totalTokens: 10 },
        latencyMs: 5,
        finishReason: "stop",
      }));

      const res = await mock.complete({
        messages: [{ role: "user", content: "Echo this text" }],
      });

      expect(res.content).toBe("Handled prompt: Echo this text");
    });

    it("should execute healthCheck correctly and report status", async () => {
      const mock = new MockAIProvider();
      let health = await mock.healthCheck();
      expect(health.healthy).toBe(true);

      mock.setHealthy(false, "Simulated outage");
      health = await mock.healthCheck();
      expect(health.healthy).toBe(false);
      expect(health.message).toBe("Simulated outage");
    });
  });

  describe("Prompt Versioning & PromptRegistry", () => {
    it("should interpolate template variables and enforce required variables", () => {
      interface SentimentPromptVars extends Record<string, unknown> {
        companyName: string;
        feedbackText: string;
        sourceType: string;
      }

      const template = new PromptTemplate<SentimentPromptVars>({
        id: "cx-sentiment-analyzer",
        version: "v1.2.0",
        description: "Standard customer sentiment extraction prompt",
        requiredVariables: ["companyName", "feedbackText"],
        template:
          "Analyze customer feedback for {{companyName}} from source {{sourceType}}:\n\n{{feedbackText}}",
        systemTemplate: "You are an intelligence engine for {{companyName}}.",
      });

      const formatted = template.format({
        companyName: "Acme Corp",
        feedbackText: "Great customer support!",
        sourceType: "Trustpilot",
      });

      expect(formatted).toContain("Analyze customer feedback for Acme Corp from source Trustpilot:");
      expect(formatted).toContain("Great customer support!");

      const formattedSystem = template.formatSystem({
        companyName: "Acme Corp",
        feedbackText: "",
        sourceType: "",
      });
      expect(formattedSystem).toBe("You are an intelligence engine for Acme Corp.");
      expect(template.getVersionTag()).toBe("cx-sentiment-analyzer@v1.2.0");
    });

    it("should throw an error when formatting with missing required variables", () => {
      const template = new PromptTemplate({
        id: "missing-vars-test",
        version: "v1.0.0",
        description: "Test",
        requiredVariables: ["tenantId", "dataPayload"],
        template: "Process {{tenantId}}: {{dataPayload}}",
      });

      expect(() => {
        template.format({ tenantId: "tenant-1" } as any);
      }).toThrow(/missing required variables: dataPayload/);
    });

    it("should register templates and retrieve by ID or specific version", () => {
      const registry = PromptRegistry.getInstance();

      registry.register({
        id: "topic-classifier",
        version: "v1.0.0",
        description: "Initial classifier",
        template: "Classify: {{text}}",
      });

      registry.register(
        {
          id: "topic-classifier",
          version: "v1.1.0",
          description: "Improved classifier",
          template: "Classify and tag topic: {{text}}",
        },
        true // Set as default version
      );

      const defaultTemplate = registry.get("topic-classifier");
      expect(defaultTemplate?.version).toBe("v1.1.0");

      const v1Template = registry.get("topic-classifier", "v1.0.0");
      expect(v1Template?.version).toBe("v1.0.0");

      const versions = registry.getVersions("topic-classifier");
      expect(versions).toEqual(["v1.0.0", "v1.1.0"]);
    });
  });

  describe("Resilience & Exponential Backoff Calculations", () => {
    it("should compute exponential backoff with bounded maxDelay", () => {
      const config = {
        maxRetries: 4,
        baseDelayMs: 100,
        maxDelayMs: 500,
        jitter: false,
        retryableStatusCodes: [500],
      };

      // attempt 0: min(500, 100 * 2^0) = 100
      expect(calculateBackoffDelay(0, config)).toBe(100);
      // attempt 1: min(500, 100 * 2^1) = 200
      expect(calculateBackoffDelay(1, config)).toBe(200);
      // attempt 2: min(500, 100 * 2^2) = 400
      expect(calculateBackoffDelay(2, config)).toBe(400);
      // attempt 3: min(500, 100 * 2^3) = 500 (capped at maxDelayMs)
      expect(calculateBackoffDelay(3, config)).toBe(500);
    });

    it("should include randomized jitter when jitter is enabled", () => {
      const config = {
        maxRetries: 3,
        baseDelayMs: 100,
        maxDelayMs: 1000,
        jitter: true,
        retryableStatusCodes: [500],
      };

      const delay = calculateBackoffDelay(1, config);
      // Base exponential is 200, jitter adds 0 to 50ms
      expect(delay).toBeGreaterThanOrEqual(200);
      expect(delay).toBeLessThanOrEqual(250);
    });

    it("should support abort signal cancellation during backoff delay in executeWithRetry", async () => {
      const controller = new AbortController();

      const operation = vi.fn().mockImplementation(async (attempt: number) => {
        if (attempt === 0) {
          // Abort during backoff
          setTimeout(() => controller.abort(), 10);
          throw new AIGatewayError("Gateway 503", 503);
        }
        return "success";
      });

      await expect(
        executeWithRetry(operation, {
          config: { maxRetries: 2, baseDelayMs: 100 },
          signal: controller.signal,
        })
      ).rejects.toThrow(/Operation aborted/);
    });
  });

  describe("Provider Factory & Model Routing", () => {
    it("should resolve models correctly based on tier configuration", () => {
      expect(resolveModelForTier("fast")).toBe("openai/gpt-4o-mini");
      expect(resolveModelForTier("standard")).toBe("anthropic/claude-3-5-sonnet");
      expect(resolveModelForTier("reasoning")).toBe("anthropic/claude-3-7-sonnet");
      expect(resolveModelForTier("custom/my-fine-tuned-model")).toBe("custom/my-fine-tuned-model");
    });

    it("should return model metadata from catalog", () => {
      const sonnet = getModelMetadata("anthropic/claude-3-5-sonnet");
      expect(sonnet.name).toBe("Claude 3.5 Sonnet");
      expect(sonnet.tier).toBe("standard");
      expect(sonnet.supportsStructuredOutput).toBe(true);
      expect(sonnet.contextWindow).toBe(200000);
    });

    it("should instantiate MockAIProvider or OmniRouteAdapter based on factory options", () => {
      const mockProvider = getAIProvider({ provider: "mock" });
      expect(mockProvider).toBeInstanceOf(MockAIProvider);
      expect(mockProvider.name).toBe("mock");

      const omniProvider = getAIProvider({
        provider: "omniroute",
        apiKey: "custom-key",
      });
      expect(omniProvider).toBeInstanceOf(OmniRouteAdapter);
      expect(omniProvider.name).toBe("omniroute");
    });
  });
});
