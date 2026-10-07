---
name: ai-evaluation
description: Evaluate AI integration patterns and OmniRoute usage
---

# AI Evaluation

Evaluate AI integration implementations for correctness, security, and reliability.

## When to Use
- Reviewing OmniRoute integration code
- Evaluating AI output handling
- Reviewing prompt design
- Assessing cost implications
- Checking schema validation

## Evaluation Checklist

### Provider Configuration
- [ ] Using OmniRoute (NOT OpenRouter)
- [ ] API key from environment variable (server-side only)
- [ ] Base URL configurable
- [ ] Model name not hardcoded in features

### Provider Abstraction
- [ ] Interface defined for AI provider
- [ ] OmniRoute implements the interface
- [ ] Business logic uses interface, not concrete class
- [ ] Provider swappable without changing features
- [ ] Mock provider available for testing

```typescript
// ✅ Good: Code uses abstraction
class AnalysisService {
  constructor(private ai: AIProvider) {}
  
  async analyze(content: string): Promise<AnalysisResult> {
    return this.ai.chat([...]);
  }
}

// ❌ Bad: Code calls OmniRoute directly
class AnalysisService {
  async analyze(content: string): Promise<AnalysisResult> {
    return fetch('https://api.omniroute.io/...'); // Tightly coupled
  }
}
```

### Schema Validation (Critical)
- [ ] All AI outputs validated with Zod schemas
- [ ] Invalid outputs throw proper errors
- [ ] Fallback behavior for validation failures
- [ ] Schema matches expected output format

```typescript
// ✅ Good: Validated output
const raw = await ai.chat(messages);
const result = AnalysisSchema.parse(JSON.parse(raw.content));

// ❌ Bad: Trusting AI output
const raw = await ai.chat(messages);
const result = JSON.parse(raw.content) as AnalysisResult; // Type assertion, no validation
```

### Error Handling
- [ ] Network errors caught
- [ ] Rate limit errors handled (exponential backoff)
- [ ] Invalid response errors handled
- [ ] Timeout handling
- [ ] Graceful degradation when AI unavailable

### Prompt Design
- [ ] System prompt sets clear expectations
- [ ] Output format specified (JSON, structured)
- [ ] Edge cases covered in prompt
- [ ] Temperature appropriate for task
- [ ] Max tokens set appropriately

### Cost Management
- [ ] Token usage tracked
- [ ] Cost-appropriate model selection
- [ ] Unnecessarily long prompts avoided
- [ ] Caching for repeated queries
- [ ] Usage limits per tenant

### Security
- [ ] User data not leaked in prompts
- [ ] Prompt injection considered
- [ ] AI output sanitized before display
- [ ] API keys server-side only
- [ ] PII handling in AI requests considered

## Common Anti-Patterns

❌ **No schema validation**: Trusting AI output blindly
❌ **Hardcoded model names**: Can't switch models easily
❌ **No retry logic**: Single failure crashes feature
❌ **No cost tracking**: Surprise AI bills
❌ **Raw AI output to user**: Hallucinations displayed as fact
❌ **Tight coupling**: Direct API calls instead of abstraction
❌ **No mock provider**: Can't test without real API calls