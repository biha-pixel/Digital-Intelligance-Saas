import { z } from "zod";

export type AIErrorCode =
  | "TIMEOUT"
  | "RATE_LIMIT"
  | "GATEWAY_ERROR"
  | "AUTHENTICATION_ERROR"
  | "VALIDATION_ERROR"
  | "MALFORMED_RESPONSE"
  | "INVALID_REQUEST"
  | "UNKNOWN_ERROR";

/**
 * Base error class for all AI subsystem errors.
 */
export class AIError extends Error {
  readonly code: AIErrorCode;
  readonly status?: number;
  readonly isRetryable: boolean;
  readonly details?: unknown;
  readonly rawResponse?: string;

  constructor(
    message: string,
    options: {
      code: AIErrorCode;
      status?: number;
      isRetryable?: boolean;
      details?: unknown;
      rawResponse?: string;
      cause?: unknown;
    }
  ) {
    super(message);
    this.name = "AIError";
    this.code = options.code;
    this.status = options.status;
    this.isRetryable = options.isRetryable ?? false;
    this.details = options.details;
    this.rawResponse = options.rawResponse;

    if (options.cause) {
      this.cause = options.cause;
    }

    // Maintain prototype chain across transpilation
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when an AI request exceeds its configured timeout deadline.
 */
export class AITimeoutError extends AIError {
  readonly timeoutMs: number;

  constructor(message: string, timeoutMs: number, cause?: unknown) {
    super(message, {
      code: "TIMEOUT",
      status: 408,
      isRetryable: true,
      details: { timeoutMs },
      cause,
    });
    this.name = "AITimeoutError";
    this.timeoutMs = timeoutMs;
    Object.setPrototypeOf(this, AITimeoutError.prototype);
  }
}

/**
 * Thrown when the AI gateway or upstream provider throttles the request (HTTP 429).
 */
export class AIRateLimitError extends AIError {
  readonly retryAfterMs?: number;

  constructor(message: string, retryAfterMs?: number, rawResponse?: string) {
    super(message, {
      code: "RATE_LIMIT",
      status: 429,
      isRetryable: true,
      details: { retryAfterMs },
      rawResponse,
    });
    this.name = "AIRateLimitError";
    this.retryAfterMs = retryAfterMs;
    Object.setPrototypeOf(this, AIRateLimitError.prototype);
  }
}

/**
 * Thrown when the AI gateway encounters upstream server errors (HTTP 500, 502, 503, 504).
 */
export class AIGatewayError extends AIError {
  constructor(
    message: string,
    status: number,
    rawResponse?: string,
    cause?: unknown
  ) {
    const isRetryable = [500, 502, 503, 504].includes(status);
    super(message, {
      code: "GATEWAY_ERROR",
      status,
      isRetryable,
      rawResponse,
      cause,
    });
    this.name = "AIGatewayError";
    Object.setPrototypeOf(this, AIGatewayError.prototype);
  }
}

/**
 * Thrown when credentials or authorization fail (HTTP 401, 403).
 */
export class AIAuthenticationError extends AIError {
  constructor(message: string, status: number = 401, rawResponse?: string) {
    super(message, {
      code: "AUTHENTICATION_ERROR",
      status,
      isRetryable: false,
      rawResponse,
    });
    this.name = "AIAuthenticationError";
    Object.setPrototypeOf(this, AIAuthenticationError.prototype);
  }
}

/**
 * Thrown when the AI model returns output that violates the required Zod schema.
 * Emphasizes that model output is NEVER trusted blindly without schema validation.
 */
export class AIValidationError extends AIError {
  readonly zodErrors: z.ZodIssue[];
  readonly rawContent: string;

  constructor(
    message: string,
    zodErrors: z.ZodIssue[],
    rawContent: string
  ) {
    const formattedIssues = zodErrors
      .map((issue) => `[${issue.path.join(".") || "root"}]: ${issue.message}`)
      .join("; ");

    super(`${message} - Validation details: ${formattedIssues}`, {
      code: "VALIDATION_ERROR",
      status: 422,
      isRetryable: false,
      details: { zodErrors },
      rawResponse: rawContent,
    });
    this.name = "AIValidationError";
    this.zodErrors = zodErrors;
    this.rawContent = rawContent;
    Object.setPrototypeOf(this, AIValidationError.prototype);
  }
}

/**
 * Thrown when the AI response is not valid JSON or lacks expected message payload fields.
 */
export class AIMalformedResponseError extends AIError {
  readonly rawText: string;

  constructor(message: string, rawText: string, cause?: unknown) {
    super(message, {
      code: "MALFORMED_RESPONSE",
      status: 502,
      isRetryable: false,
      rawResponse: rawText,
      cause,
    });
    this.name = "AIMalformedResponseError";
    this.rawText = rawText;
    Object.setPrototypeOf(this, AIMalformedResponseError.prototype);
  }
}

/**
 * Thrown when the request parameters are rejected by the provider (HTTP 400).
 */
export class AIInvalidRequestError extends AIError {
  constructor(message: string, rawResponse?: string) {
    super(message, {
      code: "INVALID_REQUEST",
      status: 400,
      isRetryable: false,
      rawResponse,
    });
    this.name = "AIInvalidRequestError";
    Object.setPrototypeOf(this, AIInvalidRequestError.prototype);
  }
}

/**
 * Evaluates whether an error is transient and safe to retry.
 */
export function isRetryableAIError(error: unknown): boolean {
  if (error instanceof AIError) {
    return error.isRetryable;
  }
  if (error instanceof Error) {
    // Network / abort timeouts
    if (error.name === "AbortError" || error.name === "TimeoutError") {
      return true;
    }
    // Fetch socket / connection reset errors
    const msg = error.message.toLowerCase();
    if (
      msg.includes("econnreset") ||
      msg.includes("etimedout") ||
      msg.includes("fetch failed") ||
      msg.includes("network error")
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Maps standard HTTP status codes and response bodies to appropriate AIError subclasses.
 */
export function mapHttpErrorToAIError(
  status: number,
  responseBody: string,
  context?: Record<string, unknown>
): AIError {
  let parsedMessage = `AI Gateway returned HTTP ${status}`;
  try {
    const json = JSON.parse(responseBody);
    if (json.error?.message) {
      parsedMessage = json.error.message;
    } else if (json.message) {
      parsedMessage = json.message;
    }
  } catch {
    if (responseBody.trim().length > 0 && responseBody.length < 300) {
      parsedMessage = `${parsedMessage}: ${responseBody.trim()}`;
    }
  }

  switch (status) {
    case 400:
      return new AIInvalidRequestError(parsedMessage, responseBody);
    case 401:
    case 403:
      return new AIAuthenticationError(
        `Authentication failure with AI Gateway (HTTP ${status}): ${parsedMessage}`,
        status,
        responseBody
      );
    case 408:
      return new AITimeoutError(
        `AI Gateway request timed out: ${parsedMessage}`,
        Number(context?.timeoutMs) || 30000
      );
    case 429: {
      let retryAfterMs: number | undefined;
      const retryHeader = context?.retryAfterHeader;
      if (typeof retryHeader === "string") {
        const seconds = parseInt(retryHeader, 10);
        if (!isNaN(seconds)) {
          retryAfterMs = seconds * 1000;
        }
      }
      return new AIRateLimitError(
        `AI Gateway rate limit exceeded (HTTP 429): ${parsedMessage}`,
        retryAfterMs,
        responseBody
      );
    }
    case 500:
    case 502:
    case 503:
    case 504:
      return new AIGatewayError(
        `AI Gateway service error (HTTP ${status}): ${parsedMessage}`,
        status,
        responseBody
      );
    default:
      return new AIError(`Unexpected AI Gateway error (HTTP ${status}): ${parsedMessage}`, {
        code: "UNKNOWN_ERROR",
        status,
        isRetryable: false,
        rawResponse: responseBody,
        details: context,
      });
  }
}
