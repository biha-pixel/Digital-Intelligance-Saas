import { ModelConfig, ModelTier, AIRetryConfig } from "./types";

/**
 * Server-side OmniRoute Gateway Configuration.
 * Note: Must NEVER use NEXT_PUBLIC_ prefixes for API keys or private endpoints.
 */
export interface OmniRouteConfig {
  apiKey: string;
  baseUrl: string;
  defaultModel: string;
  fastModel: string;
  reasoningModel: string;
  defaultTimeoutMs: number;
}

/**
 * Default retry policy for AI Gateway requests.
 */
export const DEFAULT_AI_RETRY_CONFIG: AIRetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  jitter: true,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};

/**
 * Default request timeout policies categorized by model tier.
 */
export const DEFAULT_TIER_TIMEOUTS: Record<ModelTier, number> = {
  fast: 15000, // 15s for quick classifications and simple extractions
  standard: 30000, // 30s for standard synthesis and schema generation
  reasoning: 60000, // 60s for deep multi-step reasoning and root-cause analysis
};

/**
 * Curated catalog of standard models routed through OmniRoute.
 */
export const MODEL_CATALOG: Record<string, ModelConfig> = {
  "openai/gpt-4o-mini": {
    id: "openai/gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "OpenAI",
    tier: "fast",
    contextWindow: 128000,
    maxOutputTokens: 16384,
    costPer1kInput: 0.00015,
    costPer1kOutput: 0.0006,
    supportsStructuredOutput: true,
    supportsVision: true,
    recommendedUse: "Fast classification, entity extraction, sentiment labeling, and filtering.",
  },
  "anthropic/claude-3-5-haiku": {
    id: "anthropic/claude-3-5-haiku",
    name: "Claude 3.5 Haiku",
    provider: "Anthropic",
    tier: "fast",
    contextWindow: 200000,
    maxOutputTokens: 8192,
    costPer1kInput: 0.0008,
    costPer1kOutput: 0.004,
    supportsStructuredOutput: true,
    supportsVision: true,
    recommendedUse: "High-speed text classification, fast structured extraction, and preliminary tagging.",
  },
  "anthropic/claude-3-5-sonnet": {
    id: "anthropic/claude-3-5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    tier: "standard",
    contextWindow: 200000,
    maxOutputTokens: 8192,
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
    supportsStructuredOutput: true,
    supportsVision: true,
    recommendedUse: "Industry-standard benchmark for complex customer feedback synthesis and structured schemas.",
  },
  "openai/gpt-4o": {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    tier: "standard",
    contextWindow: 128000,
    maxOutputTokens: 4096,
    costPer1kInput: 0.0025,
    costPer1kOutput: 0.01,
    supportsStructuredOutput: true,
    supportsVision: true,
    recommendedUse: "Multimodal analysis, complex schema generation, and cross-channel topic clustering.",
  },
  "anthropic/claude-3-7-sonnet": {
    id: "anthropic/claude-3-7-sonnet",
    name: "Claude 3.7 Sonnet (Hybrid Reasoning)",
    provider: "Anthropic",
    tier: "reasoning",
    contextWindow: 200000,
    maxOutputTokens: 64000,
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
    supportsStructuredOutput: true,
    supportsVision: true,
    recommendedUse: "Deep root-cause analysis, complex trend inference, and enterprise executive reports.",
  },
  "deepseek/deepseek-r1": {
    id: "deepseek/deepseek-r1",
    name: "DeepSeek R1",
    provider: "DeepSeek",
    tier: "reasoning",
    contextWindow: 64000,
    maxOutputTokens: 8192,
    costPer1kInput: 0.00055,
    costPer1kOutput: 0.00219,
    supportsStructuredOutput: true,
    supportsVision: false,
    recommendedUse: "Complex logical deduction, cross-review correlation, and competitive intelligence clustering.",
  },
};

/**
 * Validates and retrieves server-side OmniRoute configuration.
 */
export function getOmniRouteConfig(): OmniRouteConfig {
  const apiKey = process.env.OMNIROUTE_API_KEY || "";
  const baseUrl = (process.env.OMNIROUTE_BASE_URL || "https://api.omniroute.ai/v1").replace(
    /\/+$/,
    ""
  );
  const defaultModel = process.env.OMNIROUTE_DEFAULT_MODEL || process.env.OMNIROUTE_MODEL || "anthropic/claude-3-5-sonnet";
  const fastModel = process.env.OMNIROUTE_FAST_MODEL || "openai/gpt-4o-mini";
  const reasoningModel = process.env.OMNIROUTE_REASONING_MODEL || "anthropic/claude-3-7-sonnet";

  return {
    apiKey,
    baseUrl,
    defaultModel,
    fastModel,
    reasoningModel,
    defaultTimeoutMs: 30000,
  };
}

/**
 * Resolves a model ID based on requested tier or specific model ID string.
 */
export function resolveModelForTier(
  tierOrModelId?: string | ModelTier,
  config?: OmniRouteConfig
): string {
  const resolvedConfig = config || getOmniRouteConfig();

  if (!tierOrModelId) {
    return resolvedConfig.defaultModel;
  }

  if (tierOrModelId === "fast") {
    return resolvedConfig.fastModel;
  }

  if (tierOrModelId === "standard") {
    return resolvedConfig.defaultModel;
  }

  if (tierOrModelId === "reasoning") {
    return resolvedConfig.reasoningModel;
  }

  return tierOrModelId;
}

/**
 * Finds model specifications in the catalog or creates a dynamic fallback config.
 */
export function getModelMetadata(modelId: string): ModelConfig {
  if (MODEL_CATALOG[modelId]) {
    return MODEL_CATALOG[modelId];
  }

  // Infer tier from name heuristic
  let tier: ModelTier = "standard";
  const lower = modelId.toLowerCase();
  if (lower.includes("mini") || lower.includes("haiku") || lower.includes("flash") || lower.includes("nano")) {
    tier = "fast";
  } else if (lower.includes("r1") || lower.includes("o1") || lower.includes("o3") || lower.includes("reasoning") || lower.includes("3-7")) {
    tier = "reasoning";
  }

  return {
    id: modelId,
    name: modelId,
    provider: modelId.split("/")[0] || "Custom",
    tier,
    contextWindow: 128000,
    maxOutputTokens: 4096,
    supportsStructuredOutput: true,
    recommendedUse: "Custom model configured via OmniRoute gateway.",
  };
}
