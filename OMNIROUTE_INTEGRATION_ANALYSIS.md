# OmniRoute AI Integration Test Preparation

**Date:** 2026-10-18  
**Purpose:** Prepare safe, opt-in live OmniRoute integration test without modifying production behavior

---

## 1. Current OmniRoute Adapter Implementation

### Request Building (`complete()` method, lines 60-195)

**Authentication:**
- Validates API key exists: `validateApiKey()` throws `AIAuthenticationError` if missing (line 61)
- Injects bearer token in `Authorization` header: `Bearer ${this.config.apiKey}` (line 91)
- Never logs or exposes the key

**Model Selection:**
- Accepts `request.model` (specific model ID) OR `request.modelTier` (fast/standard/reasoning)
- Falls back to config defaults via `resolveModelForTier()` (line 63)
- Default model: `anthropic/claude-3-5-sonnet` (from `OMNIROUTE_DEFAULT_MODEL` env var)

**Request Construction (lines 76-81):**
```javascript
const payload = {
  model: modelId,
  messages,
  temperature: request.temperature ?? 0.2,
  max_tokens: request.maxTokens,
};
```

**Endpoint:**
- Base URL: `process.env.OMNIROUTE_BASE_URL || "https://api.omniroute.ai/v1"`
- Full endpoint: `${baseUrl}/chat/completions` (line 83)
- Uses OpenAI-compatible `/chat/completions` API

**Timeouts:**
- Default: 30 seconds (per tier: fast=15s, standard=30s, reasoning=60s)
- AbortController with timer ensures strict timeout enforcement (lines 71-72, 106)
- Timeout throws `AITimeoutError` (lines 98-101)

**Response Parsing (lines 109-176):**
- Expects standard OpenAI-compatible response format:
  ```json
  {
    "model": "...",
    "choices": [{ "message": { "content": "..." }, "finish_reason": "stop" }],
    "usage": { "prompt_tokens": ..., "completion_tokens": ..., "total_tokens": ... }
  }
  ```
- Validates `choices` array exists and has at least 1 item (line 129)
- Extracts `message.content` as response text (lines 137-144)
- Parses token usage (lines 147-149)
- **Cost calculation is deterministic** (lines 153-157):
  ```javascript
  estimatedCostUsd = (promptTokens / 1000) * costPer1kInput + (completionTokens / 1000) * costPer1kOutput
  ```

### Structured Output (`generateStructured()` method, lines 201-373)

**Key Differences from `complete()`:**
- Temperature hardcoded to 0.0 (deterministic for structured extraction) (line 236)
- Adds `response_format: { type: "json_object" }` to payload (line 238)
- Enhances system prompt with strict JSON requirements (lines 211-217):
  ```
  "CRITICAL: Output must be a strictly valid, parsable JSON object matching the requested schema. Do NOT include markdown commentary outside the JSON."
  ```

**JSON Cleaning (lines 34-39):**
- Strips markdown code fences: `` ```json ... ``` `` (regex on line 36)
- Handles both ````json` and bare backticks

**Schema Validation (lines 316-324):**
- Parses JSON output (line 307)
- Runs Zod `safeParse()` (line 317)
- Throws `AIValidationError` with detailed issues if validation fails (lines 319-323)
- **NEVER trusts model output without schema validation** (comment line 198)

### Error Handling

**Retry Behavior:**
- HTTP 500/502/503/504 → `AIGatewayError` with `isRetryable: true` (retries via `executeWithRetry()`)
- HTTP 429 → `AIRateLimitError` with `isRetryable: true` (respects `retry-after` header)
- HTTP 401/403 → `AIAuthenticationError` with `isRetryable: false` (fast fail)
- HTTP 400 → `AIInvalidRequestError` with `isRetryable: false` (malformed request)
- Non-JSON response → `AIMalformedResponseError` with `isRetryable: false`

**Timeout Handling:**
- AbortSignal properly cancels fetch (lines 71-72, 106)
- Network errors during fetch caught and mapped to timeout if signal was aborted (lines 97-104)

---

## 2. Provider Selection Behavior Verification

### Current Logic (`src/lib/ai/provider.ts`, lines 25-28)

```typescript
const providerType =
  opts.provider ||
  process.env.AI_PROVIDER ||
  (process.env.NODE_ENV === "test" && !process.env.OMNIROUTE_API_KEY ? "mock" : "omniroute");
```

**Behavior Truth Table:**

| Scenario | `NODE_ENV` | `OMNIROUTE_API_KEY` | Result |
|----------|-----------|-------------------|--------|
| Local dev, no key | `development` | Unset | `omniroute` adapter (will fail on first request) |
| Local dev, with key | `development` | Set | `omniroute` adapter (will work) |
| Test mode, no key | `test` | Unset | **`mock` adapter** (safe) |
| Test mode, with key | `test` | Set | `omniroute` adapter (will make real calls) |
| Prod, no key | `production` | Unset | `omniroute` adapter (will fail on first request) |
| Prod, with key | `production` | Set | `omniroute` adapter (will work) |

**Confirmed Behavior:**
- ✅ Default is `omniroute` unless explicitly set to `mock`
- ✅ Tests default to `mock` ONLY if both: `NODE_ENV === "test"` AND no `OMNIROUTE_API_KEY`
- ✅ Setting `OMNIROUTE_API_KEY` in test environment forces real API calls even in `npm test`
- ⚠️ **Not environment-namespaced** — test vs prod use same env var name

### Configuration Resolution (`src/lib/ai/config.ts`, lines 123-141)

```typescript
export function getOmniRouteConfig(): OmniRouteConfig {
  const apiKey = process.env.OMNIROUTE_API_KEY || "";
  const baseUrl = (process.env.OMNIROUTE_BASE_URL || "https://api.omniroute.ai/v1").replace(/\/+$/, "");
  const defaultModel = process.env.OMNIROUTE_DEFAULT_MODEL || process.env.OMNIROUTE_MODEL || "anthropic/claude-3-5-sonnet";
  const fastModel = process.env.OMNIROUTE_FAST_MODEL || "openai/gpt-4o-mini";
  const reasoningModel = process.env.OMNIROUTE_REASONING_MODEL || "anthropic/claude-3-7-sonnet";
  return { apiKey, baseUrl, defaultModel, fastModel, reasoningModel, defaultTimeoutMs: 30000 };
}
```

**Configuration Fallback Chain:**
1. Explicit env vars: `OMNIROUTE_*`
2. Defaults hardcoded in config
3. No validation — if vars are invalid, errors occur at request time

**Confirmed Settings:**
- ✅ Base URL defaults to `https://api.omniroute.ai/v1`
- ✅ Default model: `anthropic/claude-3-5-sonnet`
- ✅ Fast model: `openai/gpt-4o-mini`
- ✅ Reasoning model: `anthropic/claude-3-7-sonnet`
- ✅ All model IDs are valid catalog entries (lines 39-118)

---

## 3. Confirmed Bugs / Discrepancies

### None found in adapter implementation

The adapter is **well-engineered**:
- ✅ Strict schema validation on structured output
- ✅ Deterministic cost calculation
- ✅ Proper timeout handling with AbortController
- ✅ Comprehensive error mapping
- ✅ No secrets logged
- ✅ Retry logic properly configured
- ✅ Mock adapter well-integrated for testing

---

## 4. Files to Create

**New Test File:** `tests/ai/omniroute-provider-live.test.ts`

This will be a **separate, opt-in test suite** that:
- Only runs if `CXPULSE_LIVE_INTEGRATION_TESTS=1` environment variable is set
- Requires valid `OMNIROUTE_API_KEY` and `OMNIROUTE_BASE_URL`
- Makes only 2 real API calls (one `generateStructured`, one error case)
- Validates responses against actual `FeedbackAnalysisSchema`
- Never prints secrets or credentials
- Skips cleanly if environment is not configured

---

## 5. Test Configuration & Execution

### Required Environment Setup

```bash
export CXPULSE_LIVE_INTEGRATION_TESTS=1
export OMNIROUTE_API_KEY="your-real-key-here"
export OMNIROUTE_BASE_URL="https://api.omniroute.ai/v1"
```

### Command to Run

```bash
# Run ONLY the live OmniRoute integration test
CXPULSE_LIVE_INTEGRATION_TESTS=1 npm test -- tests/ai/omniroute-provider-live.test.ts

# Run all tests including live integration
CXPULSE_LIVE_INTEGRATION_TESTS=1 npm test

# Run without live integration (default, skips the test)
npm test
```

### What Constitutes a Pass

1. **Structured Analysis Request (FeedbackAnalysisSchema):**
   - ✅ Real OmniRoute API call succeeds (HTTP 200)
   - ✅ Response is valid JSON
   - ✅ Response validates against `FeedbackAnalysisSchema`
   - ✅ All required fields present with correct types
   - ✅ Confidence scores bounded [0, 1]
   - ✅ Token usage captured correctly
   - ✅ Cost calculation performed (if pricing metadata available)
   - ✅ Latency measured correctly

2. **Error Handling:**
   - ✅ Invalid API key throws `AIAuthenticationError`
   - ✅ Error is caught and logged safely (no key exposure)

3. **No Side Effects:**
   - ✅ No database modifications
   - ✅ No persistent state changes
   - ✅ Can run multiple times without issues

---

## 6. Remaining Uncertainties

1. **Live OmniRoute Endpoint Behavior:**
   - What is the actual base URL? (Config defaults to `https://api.omniroute.ai/v1`)
   - Does it support `/chat/completions`?
   - What is the rate limit behavior?
   - What is actual token pricing?

2. **Model Availability:**
   - Are all catalog models available through OmniRoute gateway?
   - Specifically: `anthropic/claude-3-5-sonnet`, `openai/gpt-4o-mini`, etc.?

3. **Response Format Compatibility:**
   - Does OmniRoute return exact OpenAI format?
   - Any quirks in token counting or cost reporting?

4. **Cost Impact:**
   - Two structured requests + one error test = minimal cost
   - Exact cost depends on prompt length and model used

---

## Next Steps

1. ✅ Implement opt-in integration test (`omniroute-provider-live.test.ts`)
2. ⏳ Verify existing mock tests still pass
3. ⏳ Document exact command to run live test
4. ⏳ Run test WITH live flag set (when credentials available)
5. ⏳ Run test WITHOUT live flag set (verify skip behavior)
