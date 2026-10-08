import {
  AIProvider,
  AIRequest,
  AIResponse,
  StructuredAIRequest,
  StructuredAIResponse,
  AIProviderHealth,
  ModelConfig,
  ModelTier,
  AIFinishReason,
  AIMessage,
} from "../types";
import {
  OmniRouteConfig,
  getOmniRouteConfig,
  resolveModelForTier,
  getModelMetadata,
  MODEL_CATALOG,
  DEFAULT_TIER_TIMEOUTS,
} from "../config";
import {
  AIError,
  AITimeoutError,
  AIAuthenticationError,
  AIValidationError,
  AIMalformedResponseError,
  mapHttpErrorToAIError,
} from "../errors";
import { executeWithRetry } from "../retry";

/**
 * Strips code fences (e.g. ```json ... ```) from LLM output if present.
 */
function cleanJsonText(raw: string): string {
  const trimmed = raw.trim();
  const fenceRegex = /^```(?:json)?\s*([\s\S]*?)\s*```$/i;
  const match = trimmed.match(fenceRegex);
  return match ? match[1].trim() : trimmed;
}

/**
 * Concrete OmniRoute AI Gateway Client Adapter.
 * Connects the SaaS application to configured models via the OmniRoute Gateway.
 */
export class OmniRouteAdapter implements AIProvider {
  readonly name = "omniroute";
  private config: OmniRouteConfig;

  constructor(configOverrides?: Partial<OmniRouteConfig>) {
    const baseConfig = getOmniRouteConfig();
    this.config = {
      ...baseConfig,
      ...configOverrides,
    };
  }

  /**
   * Executes an unstructured text completion request through the OmniRoute Gateway.
   */
  async complete(request: AIRequest): Promise<AIResponse<string>> {
    this.validateApiKey();

    const modelId = resolveModelForTier(request.model || request.modelTier, this.config);
    const modelMeta = this.getModelConfig(modelId);
    const timeoutMs = request.timeoutMs ?? DEFAULT_TIER_TIMEOUTS[modelMeta.tier] ?? this.config.defaultTimeoutMs;

    return await executeWithRetry(
      async () => {
        const startTime = Date.now();
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        try {
          const messages = this.formatMessages(request);

          const payload = {
            model: modelId,
            messages,
            temperature: request.temperature ?? 0.2,
            max_tokens: request.maxTokens,
          };

          const endpoint = `${this.config.baseUrl}/chat/completions`;
          let response: Response;

          try {
            response = await fetch(endpoint, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${this.config.apiKey}`,
              },
              body: JSON.stringify(payload),
              signal: controller.signal,
            });
          } catch (fetchError: unknown) {
            if (controller.signal.aborted) {
              throw new AITimeoutError(
                `OmniRoute request timed out after ${timeoutMs}ms`,
                timeoutMs,
                fetchError
              );
            }
            throw fetchError;
          } finally {
            clearTimeout(timer);
          }

          const responseText = await response.text();

          if (!response.ok) {
            throw mapHttpErrorToAIError(response.status, responseText, {
              timeoutMs,
              retryAfterHeader: response.headers.get("retry-after") || undefined,
            });
          }

          let json: any;
          try {
            json = JSON.parse(responseText);
          } catch (parseErr) {
            throw new AIMalformedResponseError(
              "OmniRoute returned non-JSON HTTP 200 payload",
              responseText,
              parseErr
            );
          }

          if (!json.choices || !Array.isArray(json.choices) || json.choices.length === 0) {
            throw new AIMalformedResponseError(
              "OmniRoute response missing 'choices' array",
              responseText
            );
          }

          const firstChoice = json.choices[0];
          if (!firstChoice.message || typeof firstChoice.message.content !== "string") {
            throw new AIMalformedResponseError(
              "OmniRoute response choice missing 'message.content'",
              responseText
            );
          }

          const content = firstChoice.message.content;
          const latencyMs = Date.now() - startTime;

          const promptTokens = Number(json.usage?.prompt_tokens) || 0;
          const completionTokens = Number(json.usage?.completion_tokens) || 0;
          const totalTokens = Number(json.usage?.total_tokens) || (promptTokens + completionTokens);

          // Calculate estimated cost if pricing metadata is available
          let estimatedCostUsd: number | undefined;
          if (modelMeta.costPer1kInput && modelMeta.costPer1kOutput) {
            estimatedCostUsd =
              (promptTokens / 1000) * modelMeta.costPer1kInput +
              (completionTokens / 1000) * modelMeta.costPer1kOutput;
          }

          const finishReason = (firstChoice.finish_reason as AIFinishReason) || "stop";

          return {
            content,
            rawText: content,
            model: json.model || modelId,
            provider: modelMeta.provider,
            usage: {
              promptTokens,
              completionTokens,
              totalTokens,
              estimatedCostUsd,
            },
            latencyMs,
            finishReason,
            promptVersion: request.promptVersion,
            metadata: request.metadata,
          };
        } catch (err: unknown) {
          if (err instanceof AIError) {
            throw err;
          }
          if (controller.signal.aborted) {
            throw new AITimeoutError(
              `OmniRoute request timed out after ${timeoutMs}ms`,
              timeoutMs,
              err
            );
          }
          throw err;
        }
      },
      {
        config: request.retryConfig,
      }
    );
  }

  /**
   * Executes a structured output request with runtime Zod schema validation.
   * Model output is NEVER trusted blindly; it is validated against the schema.
   */
  async generateStructured<T>(
    request: StructuredAIRequest<T>
  ): Promise<StructuredAIResponse<T>> {
    this.validateApiKey();

    const modelId = resolveModelForTier(request.model || request.modelTier, this.config);
    const modelMeta = this.getModelConfig(modelId);
    const timeoutMs = request.timeoutMs ?? DEFAULT_TIER_TIMEOUTS[modelMeta.tier] ?? this.config.defaultTimeoutMs;

    // Enhance system instructions to strictly mandate JSON structured output
    const enhancedSystemPrompt = [
      request.systemPrompt || "You are a precise data extraction and intelligence engine.",
      "CRITICAL: Output must be a strictly valid, parsable JSON object matching the requested schema. Do NOT include markdown commentary outside the JSON.",
      request.schemaDescription ? `Schema Instructions: ${request.schemaDescription}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const requestWithEnhancedPrompt: AIRequest = {
      ...request,
      systemPrompt: enhancedSystemPrompt,
    };

    return await executeWithRetry(
      async () => {
        const startTime = Date.now();
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        try {
          const messages = this.formatMessages(requestWithEnhancedPrompt);

          const payload: Record<string, any> = {
            model: modelId,
            messages,
            temperature: request.temperature ?? 0.0, // Low temperature for deterministic structured extraction
            max_tokens: request.maxTokens,
            response_format: { type: "json_object" },
          };

          const endpoint = `${this.config.baseUrl}/chat/completions`;
          let response: Response;

          try {
            response = await fetch(endpoint, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${this.config.apiKey}`,
              },
              body: JSON.stringify(payload),
              signal: controller.signal,
            });
          } catch (fetchError: unknown) {
            if (controller.signal.aborted) {
              throw new AITimeoutError(
                `OmniRoute structured request timed out after ${timeoutMs}ms`,
                timeoutMs,
                fetchError
              );
            }
            throw fetchError;
          } finally {
            clearTimeout(timer);
          }

          const responseText = await response.text();

          if (!response.ok) {
            throw mapHttpErrorToAIError(response.status, responseText, {
              timeoutMs,
              retryAfterHeader: response.headers.get("retry-after") || undefined,
            });
          }

          let json: any;
          try {
            json = JSON.parse(responseText);
          } catch (parseErr) {
            throw new AIMalformedResponseError(
              "OmniRoute returned non-JSON HTTP 200 payload",
              responseText,
              parseErr
            );
          }

          if (!json.choices || !Array.isArray(json.choices) || json.choices.length === 0) {
            throw new AIMalformedResponseError(
              "OmniRoute response missing 'choices' array",
              responseText
            );
          }

          const firstChoice = json.choices[0];
          if (!firstChoice.message || typeof firstChoice.message.content !== "string") {
            throw new AIMalformedResponseError(
              "OmniRoute response choice missing 'message.content'",
              responseText
            );
          }

          const rawContent = firstChoice.message.content;
          const cleanedContent = cleanJsonText(rawContent);

          let parsedPayload: unknown;
          try {
            parsedPayload = JSON.parse(cleanedContent);
          } catch (jsonErr) {
            throw new AIMalformedResponseError(
              `Model output could not be parsed as JSON: ${rawContent}`,
              rawContent,
              jsonErr
            );
          }

          // Authoritative runtime Zod schema validation
          const validationResult = request.schema.safeParse(parsedPayload);
          if (!validationResult.success) {
            throw new AIValidationError(
              `Model output violated the specified schema (${request.schemaName || "UnnamedSchema"})`,
              validationResult.error.issues,
              rawContent
            );
          }

          const latencyMs = Date.now() - startTime;
          const promptTokens = Number(json.usage?.prompt_tokens) || 0;
          const completionTokens = Number(json.usage?.completion_tokens) || 0;
          const totalTokens = Number(json.usage?.total_tokens) || (promptTokens + completionTokens);

          let estimatedCostUsd: number | undefined;
          if (modelMeta.costPer1kInput && modelMeta.costPer1kOutput) {
            estimatedCostUsd =
              (promptTokens / 1000) * modelMeta.costPer1kInput +
              (completionTokens / 1000) * modelMeta.costPer1kOutput;
          }

          return {
            data: validationResult.data,
            content: validationResult.data,
            rawText: rawContent,
            model: json.model || modelId,
            provider: modelMeta.provider,
            usage: {
              promptTokens,
              completionTokens,
              totalTokens,
              estimatedCostUsd,
            },
            latencyMs,
            finishReason: (firstChoice.finish_reason as AIFinishReason) || "stop",
            promptVersion: request.promptVersion,
            metadata: request.metadata,
          };
        } catch (err: unknown) {
          if (err instanceof AIError) {
            throw err;
          }
          if (controller.signal.aborted) {
            throw new AITimeoutError(
              `OmniRoute structured request timed out after ${timeoutMs}ms`,
              timeoutMs,
              err
            );
          }
          throw err;
        }
      },
      {
        config: request.retryConfig,
      }
    );
  }

  /**
   * Verifies connectivity to the OmniRoute gateway.
   */
  async healthCheck(): Promise<AIProviderHealth> {
    const timestamp = new Date().toISOString();

    if (!this.config.apiKey) {
      return {
        healthy: false,
        provider: this.name,
        message: "OMNIROUTE_API_KEY is not configured",
        timestamp,
      };
    }

    const start = Date.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.config.baseUrl}/models`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        signal: controller.signal,
      }).finally(() => clearTimeout(timer));

      const latencyMs = Date.now() - start;

      if (response.ok) {
        return {
          healthy: true,
          latencyMs,
          provider: this.name,
          message: "OmniRoute Gateway operational",
          timestamp,
        };
      }

      return {
        healthy: false,
        latencyMs,
        provider: this.name,
        message: `OmniRoute Gateway responded with HTTP ${response.status}`,
        timestamp,
      };
    } catch (err: any) {
      return {
        healthy: false,
        latencyMs: Date.now() - start,
        provider: this.name,
        message: `OmniRoute health check failed: ${err.message || String(err)}`,
        timestamp,
      };
    }
  }

  /**
   * Retrieves model metadata specifications.
   */
  getModelConfig(modelIdOrTier?: string | ModelTier): ModelConfig {
    const resolvedId = resolveModelForTier(modelIdOrTier, this.config);
    return getModelMetadata(resolvedId);
  }

  /**
   * Lists all standard models in the catalog.
   */
  listAvailableModels(): ModelConfig[] {
    return Object.values(MODEL_CATALOG);
  }

  private validateApiKey(): void {
    if (!this.config.apiKey) {
      throw new AIAuthenticationError(
        "OmniRoute API key is missing. Ensure OMNIROUTE_API_KEY is configured in server-side environment variables.",
        401
      );
    }
  }

  private formatMessages(request: AIRequest): AIMessage[] {
    const formatted: AIMessage[] = [];

    if (request.systemPrompt) {
      formatted.push({
        role: "system",
        content: request.systemPrompt,
      });
    }

    formatted.push(...request.messages);
    return formatted;
  }
}
