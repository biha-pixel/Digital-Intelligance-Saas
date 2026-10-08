import { AIRetryConfig } from "./types";
import { DEFAULT_AI_RETRY_CONFIG } from "./config";
import { isRetryableAIError } from "./errors";

/**
 * Calculates exponential backoff delay with full randomized jitter.
 * Formula: min(maxDelay, baseDelay * 2^attempt) + jitter(0 to baseDelay)
 */
export function calculateBackoffDelay(
  attempt: number,
  config: AIRetryConfig = DEFAULT_AI_RETRY_CONFIG
): number {
  const exponential = Math.min(
    config.maxDelayMs,
    config.baseDelayMs * Math.pow(2, attempt)
  );

  if (!config.jitter) {
    return exponential;
  }

  // Full jitter: add random delay between 0 and 50% of the calculated base delay
  const jitterAmount = Math.random() * (config.baseDelayMs * 0.5);
  return Math.min(config.maxDelayMs, Math.round(exponential + jitterAmount));
}

export interface RetryOptions {
  config?: Partial<AIRetryConfig>;
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
  signal?: AbortSignal;
}

/**
 * Executes an async operation with automated exponential backoff and jitter for retryable errors.
 */
export async function executeWithRetry<T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const mergedConfig: AIRetryConfig = {
    ...DEFAULT_AI_RETRY_CONFIG,
    ...options.config,
  };

  let lastError: unknown;

  for (let attempt = 0; attempt <= mergedConfig.maxRetries; attempt++) {
    // Check if the overall operation has been aborted
    if (options.signal?.aborted) {
      const abortError = new Error("Operation aborted before retry execution");
      abortError.name = "AbortError";
      throw abortError;
    }

    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;

      // If we have exhausted all retries or the error is not retryable, rethrow immediately
      const isRetryable = isRetryableAIError(error);
      const isLastAttempt = attempt >= mergedConfig.maxRetries;

      if (!isRetryable || isLastAttempt) {
        throw error;
      }

      // Compute backoff delay
      const delayMs = calculateBackoffDelay(attempt, mergedConfig);

      if (options.onRetry) {
        options.onRetry(error, attempt, delayMs);
      }

      // Wait for the computed delay with abort signal support
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          resolve();
        }, delayMs);

        if (options.signal) {
          const onAbort = () => {
            clearTimeout(timer);
            options.signal?.removeEventListener("abort", onAbort);
            const abortError = new Error("Operation aborted during retry backoff delay");
            abortError.name = "AbortError";
            reject(abortError);
          };
          options.signal.addEventListener("abort", onAbort, { once: true });
        }
      });
    }
  }

  throw lastError;
}
