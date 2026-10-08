import {
  AIProvider,
  AIRequest,
  AIResponse,
  StructuredAIRequest,
  StructuredAIResponse,
  AIProviderHealth,
  ModelConfig,
  ModelTier,
} from "../types";
import { MODEL_CATALOG, getModelMetadata } from "../config";
import {
  AITimeoutError,
  AIValidationError,
  AIMalformedResponseError,
} from "../errors";

export interface MockRecordedCall {
  request: AIRequest;
  timestamp: string;
}

export interface MockRecordedStructuredCall {
  request: StructuredAIRequest<any>;
  timestamp: string;
}

/**
 * Mock AI Provider for deterministic testing, offline development, and zero-egress CI workflows.
 */
export class MockAIProvider implements AIProvider {
  readonly name = "mock";

  private responseQueue: (AIResponse<string> | Error)[] = [];
  private structuredResponseQueue: ({ data: any; rawText?: string } | Error)[] = [];
  private callHistory: MockRecordedCall[] = [];
  private structuredCallHistory: MockRecordedStructuredCall[] = [];
  private isHealthy: boolean = true;
  private healthMessage: string = "Mock AI Provider is operational";
  private simulatedLatencyMs: number = 0;

  private customHandler?: (req: AIRequest) => Promise<AIResponse<string>>;
  private customStructuredHandler?: (req: StructuredAIRequest<any>) => Promise<StructuredAIResponse<any>>;

  /**
   * Enqueue a plain text response for the next complete() call.
   */
  enqueueResponse(response: string | Partial<AIResponse<string>>): this {
    if (typeof response === "string") {
      this.responseQueue.push({
        content: response,
        rawText: response,
        model: "mock-model",
        provider: "MockProvider",
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
        latencyMs: 15,
        finishReason: "stop",
      });
    } else {
      this.responseQueue.push({
        content: response.content || "Mock response",
        rawText: response.rawText || response.content || "Mock response",
        model: response.model || "mock-model",
        provider: response.provider || "MockProvider",
        usage: response.usage || { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
        latencyMs: response.latencyMs ?? 15,
        finishReason: response.finishReason || "stop",
        promptVersion: response.promptVersion,
        metadata: response.metadata,
      });
    }
    return this;
  }

  /**
   * Enqueue a structured data object or raw string payload for the next generateStructured() call.
   */
  enqueueStructuredResponse<T>(data: T, rawTextOverride?: string): this {
    this.structuredResponseQueue.push({
      data,
      rawText: rawTextOverride ?? JSON.stringify(data),
    });
    return this;
  }

  /**
   * Enqueue an error to be thrown on the next request.
   */
  enqueueError(error: Error): this {
    this.responseQueue.push(error);
    this.structuredResponseQueue.push(error);
    return this;
  }

  /**
   * Configure simulated network latency in milliseconds.
   */
  setSimulatedLatency(ms: number): this {
    this.simulatedLatencyMs = ms;
    return this;
  }

  /**
   * Set health check status for testing gateway health probes.
   */
  setHealthy(healthy: boolean, message?: string): this {
    this.isHealthy = healthy;
    if (message) {
      this.healthMessage = message;
    }
    return this;
  }

  /**
   * Register a dynamic custom handler for completion requests.
   */
  setCustomHandler(handler: (req: AIRequest) => Promise<AIResponse<string>>): this {
    this.customHandler = handler;
    return this;
  }

  /**
   * Register a dynamic custom handler for structured requests.
   */
  setCustomStructuredHandler(
    handler: (req: StructuredAIRequest<any>) => Promise<StructuredAIResponse<any>>
  ): this {
    this.customStructuredHandler = handler;
    return this;
  }

  /**
   * Returns all recorded completion calls.
   */
  getCallHistory(): MockRecordedCall[] {
    return [...this.callHistory];
  }

  /**
   * Returns all recorded structured completion calls.
   */
  getStructuredCallHistory(): MockRecordedStructuredCall[] {
    return [...this.structuredCallHistory];
  }

  /**
   * Clears all recorded history and enqueued responses.
   */
  reset(): void {
    this.responseQueue = [];
    this.structuredResponseQueue = [];
    this.callHistory = [];
    this.structuredCallHistory = [];
    this.customHandler = undefined;
    this.customStructuredHandler = undefined;
    this.simulatedLatencyMs = 0;
    this.isHealthy = true;
    this.healthMessage = "Mock AI Provider is operational";
  }

  async complete(request: AIRequest): Promise<AIResponse<string>> {
    this.callHistory.push({
      request,
      timestamp: new Date().toISOString(),
    });

    if (this.simulatedLatencyMs > 0) {
      if (request.timeoutMs && this.simulatedLatencyMs > request.timeoutMs) {
        throw new AITimeoutError(
          `Mock AI request timed out after ${request.timeoutMs}ms`,
          request.timeoutMs
        );
      }
      await new Promise((res) => setTimeout(res, this.simulatedLatencyMs));
    }

    if (this.customHandler) {
      return await this.customHandler(request);
    }

    if (this.responseQueue.length > 0) {
      const item = this.responseQueue.shift()!;
      if (item instanceof Error) {
        throw item;
      }
      return {
        ...item,
        promptVersion: request.promptVersion || item.promptVersion,
        metadata: request.metadata || item.metadata,
      };
    }

    return {
      content: "Default mock completion response",
      rawText: "Default mock completion response",
      model: request.model || "mock-model",
      provider: "MockProvider",
      usage: {
        promptTokens: 25,
        completionTokens: 50,
        totalTokens: 75,
      },
      latencyMs: this.simulatedLatencyMs || 10,
      finishReason: "stop",
      promptVersion: request.promptVersion,
      metadata: request.metadata,
    };
  }

  async generateStructured<T>(
    request: StructuredAIRequest<T>
  ): Promise<StructuredAIResponse<T>> {
    this.structuredCallHistory.push({
      request,
      timestamp: new Date().toISOString(),
    });

    if (this.simulatedLatencyMs > 0) {
      if (request.timeoutMs && this.simulatedLatencyMs > request.timeoutMs) {
        throw new AITimeoutError(
          `Mock AI structured request timed out after ${request.timeoutMs}ms`,
          request.timeoutMs
        );
      }
      await new Promise((res) => setTimeout(res, this.simulatedLatencyMs));
    }

    if (this.customStructuredHandler) {
      return await this.customStructuredHandler(request);
    }

    if (this.structuredResponseQueue.length > 0) {
      const item = this.structuredResponseQueue.shift()!;
      if (item instanceof Error) {
        throw item;
      }

      const rawText = item.rawText ?? JSON.stringify(item.data);
      let parsedPayload: unknown;

      try {
        parsedPayload = typeof item.data === "string" ? JSON.parse(item.data) : item.data;
      } catch (err) {
        throw new AIMalformedResponseError(
          `Mock model output could not be parsed as JSON: ${rawText}`,
          rawText,
          err
        );
      }

      const validationResult = request.schema.safeParse(parsedPayload);
      if (!validationResult.success) {
        throw new AIValidationError(
          `Mock output violated the specified schema (${request.schemaName || "UnnamedSchema"})`,
          validationResult.error.issues,
          rawText
        );
      }

      return {
        data: validationResult.data,
        content: validationResult.data,
        rawText,
        model: request.model || "mock-model",
        provider: "MockProvider",
        usage: {
          promptTokens: 40,
          completionTokens: 80,
          totalTokens: 120,
        },
        latencyMs: this.simulatedLatencyMs || 10,
        finishReason: "stop",
        promptVersion: request.promptVersion,
        metadata: request.metadata,
      };
    }

    throw new Error(
      "No enqueued structured response in MockAIProvider. Use enqueueStructuredResponse() or setCustomStructuredHandler()."
    );
  }

  async healthCheck(): Promise<AIProviderHealth> {
    return {
      healthy: this.isHealthy,
      latencyMs: this.simulatedLatencyMs || 5,
      provider: this.name,
      message: this.healthMessage,
      timestamp: new Date().toISOString(),
    };
  }

  getModelConfig(modelIdOrTier?: string | ModelTier): ModelConfig {
    if (!modelIdOrTier || modelIdOrTier === "standard") {
      return MODEL_CATALOG["anthropic/claude-3-5-sonnet"];
    }
    if (modelIdOrTier === "fast") {
      return MODEL_CATALOG["openai/gpt-4o-mini"];
    }
    if (modelIdOrTier === "reasoning") {
      return MODEL_CATALOG["anthropic/claude-3-7-sonnet"];
    }
    return getModelMetadata(modelIdOrTier);
  }

  listAvailableModels(): ModelConfig[] {
    return Object.values(MODEL_CATALOG);
  }
}
