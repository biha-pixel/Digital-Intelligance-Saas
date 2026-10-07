---
name: architecture-review
description: Review architectural decisions and design choices
---

# Architecture Review

Review architectural decisions before implementing significant features or making technology choices.

## When to Use
- Before implementing major features
- When choosing between architectural approaches
- When adding new dependencies
- When designing system boundaries
- When making technology decisions

## Review Process

### 1. State the Problem
What problem are we solving? Be specific.

Example: "We need to analyze customer feedback from scraped web pages using AI, then store and display insights."

### 2. Identify Constraints
- **Security**: Scraped content is untrusted, AI output must be validated
- **Scale**: How many analyses per day? 
- **Cost**: AI API costs per request
- **Time**: Implementation timeline
- **Technical**: Must use OmniRoute, Supabase, TypeScript

### 3. Propose Alternatives (2-3 Options)

**Option A: Synchronous API Processing**
- User requests analysis → API calls scraper → calls AI → stores result → returns
- Pros: Simple, immediate feedback
- Cons: Slow API response, timeout risk, no retry on failure

**Option B: Async Job Queue**
- User requests analysis → creates job → background worker processes → polls for result
- Pros: Fast API response, retryable, handles long operations
- Cons: More complex, requires job infrastructure

**Option C: Hybrid with Progressive Updates**
- User requests → starts job → returns job ID → WebSocket updates progress
- Pros: Fast initial response + real-time feedback
- Cons: Most complex, requires WebSocket infrastructure

### 4. Evaluate Trade-offs

| Criterion | Option A | Option B | Option C |
|-----------|----------|----------|----------|
| Complexity | Low | Medium | High |
| User Experience | Poor (slow) | Good | Excellent |
| Reliability | Low | High | High |
| Cost | Low | Medium | Medium |
| Time to Implement | 1 day | 3 days | 5 days |

### 5. Make Recommendation

**Recommendation**: Option B (Async Job Queue)

**Reasoning**:
- User experience is important - users shouldn't wait 30+ seconds
- Reliability matters - scraping and AI calls can fail
- Complexity is manageable - can use simple database-based queue initially
- Can add real-time updates later if needed

**Trade-offs Accepted**:
- More complex than synchronous approach
- Users must poll or refresh for results
- Requires job status tracking

### 6. Document Decision

Create Architecture Decision Record in `docs/architecture-decisions.md`:

```markdown
# ADR-001: Async Job Queue for AI Analysis

**Date**: 2024-01-15
**Status**: Accepted

## Context
We need to analyze scraped content with AI. Scraping + AI analysis takes 30-60 seconds, which exceeds reasonable API timeout.

## Decision
Use async job queue pattern: API creates job, background worker processes, user polls for results.

## Consequences

**Positive**:
- Fast API responses
- Retryable operations
- Better error handling
- Can scale workers independently

**Negative**:
- More complex than synchronous
- Requires job status management
- User must wait/poll for results

## Implementation
- Job table in Supabase
- Background worker using Vercel Cron or separate service
- Exponential backoff for retries
- Job status: pending → running → completed/failed

## Alternatives Considered
- Synchronous API: Rejected due to timeouts
- WebSocket updates: Deferred as future enhancement
```

### 7. Define Interfaces

Before implementing, define clear contracts:

```typescript
// types/analysis-job.ts
export interface AnalysisJob {
  id: string;
  tenantId: string;
  url: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: AnalysisResult;
  error?: string;
  attempts: number;
  createdAt: string;
  completedAt?: string;
}

export interface AnalysisResult {
  sentiment: 'positive' | 'neutral' | 'negative';
  topics: string[];
  summary: string;
  confidence: number;
}
```

## Review Checklist

- [ ] Problem clearly stated
- [ ] Constraints identified
- [ ] Multiple alternatives considered
- [ ] Trade-offs evaluated
- [ ] Recommendation with reasoning
- [ ] Trade-offs explicitly accepted
- [ ] Testing strategy defined
- [ ] Migration path (if changing existing system)
- [ ] Interfaces defined
- [ ] ADR documented

## Questions to Ask

### Security
- Where are trust boundaries?
- How is data validated?
- Are secrets properly protected?
- Is tenant isolation maintained?

### Scale
- What happens at 10x current load?
- What are the bottlenecks?
- How do we monitor performance?

### Maintainability
- Will this be easy to debug?
- Can we test this effectively?
- Is the complexity justified?

### Cost
- What are the ongoing costs?
- How do costs scale with usage?
- Are there cheaper alternatives?

## Anti-Patterns to Avoid

❌ **No alternatives considered** - "We'll use technology X" without evaluation
❌ **No trade-offs stated** - Every decision has trade-offs
❌ **Premature optimization** - Don't build for scale you don't need yet
❌ **Resume-driven development** - Don't choose tech just because it's new
❌ **Not invented here** - Don't rebuild what already exists well
❌ **Cargo culting** - Don't copy patterns without understanding why

## When to Revisit

Review architectural decisions when:
- Requirements change significantly
- Scale increases 10x
- New constraints emerge
- Better alternatives become available
- Current approach causes ongoing problems