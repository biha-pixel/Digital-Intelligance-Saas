import { z } from "zod";

/**
 * Message roles supported by AI chat completions.
 */
export type AIMessageRole = "system" | "user" | "assistant" | "tool";

/**
 * Individual chat completion message.
 */
export interface AIMessage {
  role: AIMessageRole;
  content: string;
  name?: string;
}

/**
 * Model routing tiers for dynamic multi-model selection.
 * - 'fast': Low-latency, cost-effective models (e.g. classification, extraction, filtering)
 * - 'standard': Balanced models with high capability (e.g. sentiment synthesis, summarization)
 * - 'reasoning': High-capacity reasoning models (e.g. complex analysis, trend inference, root-cause detection)
 */
export type ModelTier = "fast" | "standard" | "reasoning";

/**
 * Metadata and specifications for an AI model.
 */
export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  tier: ModelTier;
  contextWindow: number;
  maxOutputTokens: number;
  costPer1kInput?: number;
  costPer1kOutput?: number;
  supportsStructuredOutput: boolean;
  supportsVision?: boolean;
  recommendedUse: string;
}

/**
 * Token usage telemetry returned by the AI provider.
 */
export interface AIUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd?: number;
}

/**
 * Finish reason indicating why the generation stopped.
 */
export type AIFinishReason =
  | "stop"
  | "length"
  | "tool_calls"
  | "content_filter"
  | "error"
  | "unknown";

/**
 * Configuration options for retry execution.
 */
export interface AIRetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitter: boolean;
  retryableStatusCodes: number[];
}

/**
 * Standard AI completion request abstraction.
 */
export interface AIRequest {
  /** Array of conversation messages */
  messages: AIMessage[];
  /** Specific model identifier (overrides modelTier if provided) */
  model?: string;
  /** Routing tier to automatically select model */
  modelTier?: ModelTier;
  /** Sampling temperature (0.0 to 2.0; lower is more deterministic) */
  temperature?: number;
  /** Maximum output tokens to generate */
  maxTokens?: number;
  /** System instruction override/shortcut (prepended as system message) */
  systemPrompt?: string;
  /** Prompt template identifier and version for telemetry */
  promptVersion?: string;
  /** Request timeout deadline in milliseconds */
  timeoutMs?: number;
  /** Custom retry overrides for this specific request */
  retryConfig?: Partial<AIRetryConfig>;
  /** Optional metadata tags for tracking and cost allocation */
  metadata?: Record<string, unknown>;
}

/**
 * Standard unstructured AI completion response abstraction.
 */
export interface AIResponse<T = string> {
  /** Generated text content or parsed payload */
  content: T;
  /** Exact raw textual string returned by the provider */
  rawText: string;
  /** Model identifier utilized for execution */
  model: string;
  /** Gateway or upstream provider name */
  provider: string;
  /** Token usage statistics */
  usage: AIUsage;
  /** Total round-trip latency in milliseconds */
  latencyMs: number;
  /** Why generation terminated */
  finishReason: AIFinishReason;
  /** Associated prompt version if applicable */
  promptVersion?: string;
  /** Response headers / telemetry metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Structured AI request abstraction with runtime Zod schema validation.
 */
export interface StructuredAIRequest<T> extends AIRequest {
  /** Zod schema used to validate and type-cast the LLM JSON output */
  schema: z.ZodType<T>;
  /** Optional name for the schema (used in system prompts or tool declarations) */
  schemaName?: string;
  /** Optional description for the schema */
  schemaDescription?: string;
  /** Maximum schema validation retry attempts when model produces schema mismatches */
  maxSchemaRetries?: number;
}

/**
 * Strongly-typed validated response abstraction.
 */
export interface StructuredAIResponse<T> extends AIResponse<T> {
  /** Authoritative validated data parsed and checked by Zod */
  data: T;
}

/**
 * Health check status for AI Gateway connection.
 */
export interface AIProviderHealth {
  healthy: boolean;
  latencyMs?: number;
  provider: string;
  message?: string;
  timestamp: string;
}

/**
 * Core AI Provider Interface contract.
 * Decouples application logic from vendor SDKs or specific gateway implementations.
 */
export interface AIProvider {
  /** Provider identifier (e.g. 'omniroute', 'mock') */
  readonly name: string;

  /**
   * Execute raw textual completion request.
   */
  complete(request: AIRequest): Promise<AIResponse<string>>;

  /**
   * Execute structured output request with runtime Zod schema validation.
   * Guarantees that returned `data` conforms to `T` or throws `AIValidationError`.
   */
  generateStructured<T>(request: StructuredAIRequest<T>): Promise<StructuredAIResponse<T>>;

  /**
   * Verify connectivity and operational health of the AI gateway.
   */
  healthCheck(): Promise<AIProviderHealth>;

  /**
   * Resolve model specifications and limits by ID or Tier.
   */
  getModelConfig(modelIdOrTier?: string | ModelTier): ModelConfig;

  /**
   * List all registered models available through this provider.
   */
  listAvailableModels(): ModelConfig[];
}
