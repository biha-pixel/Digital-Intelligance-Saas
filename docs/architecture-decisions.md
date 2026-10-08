# Architecture Decision Records

Document significant architectural decisions, why they were made, and what alternatives were considered.

---

## ADR-001: Multi-Tenant Architecture with Supabase RLS

**Date**: 2026-10-07  
**Status**: Accepted  
**Decision by**: Project inception

### Context
We're building a multi-tenant SaaS where multiple organizations use the same application. Each tenant's data must be completely isolated from other tenants.

### Decision
Use Supabase Row Level Security (RLS) as the primary mechanism for tenant isolation.

Every tenant-scoped table must:
1. Have a `tenant_id UUID NOT NULL` column
2. Reference the `tenants` table with a foreign key
3. Have RLS enabled
4. Have policies for SELECT, INSERT, UPDATE, DELETE that enforce `tenant_id = auth.uid()`
5. Have an index on `tenant_id`

### Alternatives Considered

**Option A: Application-Level Filtering**  
Filter data in application code (WHERE tenant_id = ?) on every query.
- ❌ Easy to forget on new queries → data leaks
- ❌ No defense in depth
- ✅ Simpler to implement

**Option B: Separate Databases per Tenant**  
Each tenant gets their own database instance.
- ✅ Complete isolation
- ❌ Expensive at scale
- ❌ Complex migrations across databases
- ❌ Overkill for our scale

**Option C: Supabase RLS (Chosen)**  
Database-level row filtering based on authenticated user.
- ✅ Defense in depth (even if app is compromised)
- ✅ Consistent enforcement
- ✅ Single database for simplicity
- ✅ Built into PostgreSQL
- ❌ Slightly more complex setup

### Consequences
- **Positive**: Security at database level, hard to accidentally leak data
- **Negative**: Must remember to add RLS to every new table, must test policies
- **Mitigation**: Database agent and review skills enforce RLS checks

---

## ADR-002: OmniRoute as AI Gateway

**Date**: 2026-10-07  
**Status**: Accepted  
**Decision by**: Project inception

### Context
We need AI capabilities for customer experience analysis (sentiment, topics, summaries). We need an AI gateway to manage model access.

### Decision
Use OmniRoute as our AI gateway. NOT OpenRouter.

Implementation:
- Abstract AI provider behind an interface (`AIProvider`)
- OmniRoute client implements this interface
- Business logic calls interface, not OmniRoute directly
- All AI outputs validated with Zod schemas

### Alternatives Considered
**Direct API calls**: Calling model providers directly 
- ❌ No abstraction, hard to switch
- ❌ Must manage multiple provider APIs

**OpenRouter**: NOT applicable - we use OmniRoute specifically

### Consequences
- **Positive**: Single gateway for all AI, provider abstraction allows swapping
- **Negative**: Dependency on OmniRoute availability
- **Mitigation**: Error handling, retries, graceful degradation

---

## ADR-003: Crawl4AI for Web Scraping

**Date**: 2026-10-07  
**Status**: Accepted  
**Decision by**: Project inception

### Context
We need to scrape public web pages for customer experience data (reviews, feedback, etc.).

### Decision
Use self-hosted Crawl4AI in Docker for web scraping.

Security requirements:
- URL validation to prevent SSRF
- Content treated as untrusted data
- Rate limiting per domain
- Respect robots.txt
- No CAPTCHA bypass, no auth bypass
- Use official APIs when available

### Consequences
- **Positive**: Full control over scraping infrastructure
- **Negative**: Must maintain Docker service, handle scaling
- **Mitigation**: Health checks, monitoring, retry logic

---

## ADR-004: Provider Abstraction at Infrastructure Boundaries

**Date**: 2026-10-07  
**Status**: Accepted  
**Decision by**: Project inception

### Context
External services (AI, email, scraping) may change. We need to swap providers without rewriting business logic.

### Decision
Every external service must be accessed through a connector interface:

```typescript
// Define interface
interface EmailProvider {
  sendEmail(params: SendEmailParams): Promise<SendEmailResult>;
}

// Implement for specific provider
class ResendEmailProvider implements EmailProvider { ... }

// Business logic uses interface
class NotificationService {
  constructor(private email: EmailProvider) {}
}
```

### Consequences
- **Positive**: Swap providers easily, mock for testing
- **Negative**: More upfront code for abstractions
- **Mitigation**: Only abstract what might change

---

## ADR-005: AI Infrastructure & OmniRoute Gateway Abstraction

**Date**: 2026-10-08  
**Status**: Accepted  
**Decision by**: Architecture Team / Phase 10 Implementation

### Context
The SaaS platform requires robust, cost-effective, and resilient LLM integrations to analyze customer feedback, extract sentiment, and synthesize intelligence. We need:
1. A unified AI Gateway (OmniRoute) rather than directly coupling domain services to vendor-specific SDKs (Anthropic, OpenAI, etc.).
2. Dynamic model routing across latency and cost tiers (`fast`, `standard`, `reasoning`).
3. Deterministic timeouts with `AbortController` cancellation to prevent hung requests.
4. Exponential backoff retry policies with randomized jitter for transient gateway and rate-limit errors.
5. Strict runtime schema validation (Zod) enforcing the zero-trust rule: **"Never trust model output blindly."**
6. Semantic prompt versioning and variable interpolation for reproducible AI tasks.
7. A mock provider (`MockAIProvider`) enabling offline development and zero-egress CI testing.

### Decision
1. **OmniRoute as Exclusive AI Gateway**: All AI requests route through OmniRoute REST endpoints via `OmniRouteAdapter`. OpenRouter is strictly prohibited.
2. **Layered Decoupling**: Application services interact only with the `AIProvider` interface contract (`src/lib/ai/types.ts`).
3. **Model Tier System**: Workloads map to `fast` (`openai/gpt-4o-mini`), `standard` (`anthropic/claude-3-5-sonnet`), or `reasoning` (`anthropic/claude-3-7-sonnet`) with tailored timeouts (15s, 30s, 60s).
4. **Zod Validation & Auto-Sanitization**: All structured extraction requests parse and validate model output with Zod (`safeParse`). Code fences (e.g. ` ```json `) are automatically cleaned. Schema failures throw typed `AIValidationError` with detailed issue paths.
5. **Resilient Retry Loop**: Transient status codes (408, 429, 500, 502, 503, 504) trigger exponential backoff with full jitter and abort signal monitoring. Deterministic errors (400, 401, 403, 422) fail fast.
6. **Server-Side Security**: API keys (`OMNIROUTE_API_KEY`) and URLs (`OMNIROUTE_BASE_URL`) exist exclusively in server-side environment variables.

### Consequences
- **Positive**:
  - Hot-swappable AI providers and models with zero domain code modifications.
  - Zero-egress, fast, deterministic CI pipelines using `MockAIProvider`.
  - Elimination of hung upstream connections and cascade failures.
  - Complete type safety and runtime schema guarantees on all LLM outputs.
  - Granular cost and token usage tracking on every request.
- **Negative**:
  - Slight latency overhead from gateway proxy hop and client-side Zod validation.
- **Mitigation**:
  - Keep schema validation lightweight and utilize connection pooling in Node.js `fetch`.

---

## ADR-006: Feedback Analysis Engine & AI Evaluation Framework

**Date**: 2026-10-08  
**Status**: Accepted  
**Decision by**: Architecture Team / Phase 11 Implementation  

### Context
We need to extract high-fidelity customer intelligence (sentiment, emotion, intent, severity, topics, complaint detection, recommended actions) from unstructured feedback items ingested across multiple review sources. Because LLMs are probabilistic, we must safeguard data integrity, prevent hallucinated inconsistencies, calibrate confidence levels, and establish an automated evaluation framework to measure regressions during prompt or model upgrades.

### Decision
1. **Multi-Stage Processing Pipeline**:
   - **Deterministic Pre-Checks**: Inspect content length, empty/whitespace strings, and spam heuristics before initiating LLM calls.
   - **Versioned Prompt Registry**: Maintain immutable, SemVer prompt templates (`cx-feedback-analysis@v1.0.0` and `v2.0.0`) registered centrally.
   - **Strict Runtime Zod Validation**: Generate structured JSON via `AIProvider.generateStructured()` with strict numeric ranges (-1.0 to 1.0) and taxonomy enums.
   - **Deterministic Invariant Enforcement**: Post-process results to enforce business invariants (e.g. `complaintSummary` is forced to `null` if `complaintDetected` is `false`).
   - **Confidence Calibration & Clamping**: Heuristically clamp confidence when content is marked `isAmbiguous` or `isSpam`.
2. **Batch Processing Architecture**:
   - Implement `FeedbackBatchProcessor` with concurrency throttling and error aggregation to support scalable background worker processing.
3. **Automated AI Evaluation Framework**:
   - Curate a 35-item Golden Evaluation Benchmark covering all 11 customer feedback archetypes.
   - Calculate precision, recall, F1 score, Accuracy, Mean Absolute Error (MAE), p50/p95 latency, and token cost telemetry.
   - Implement `PromptComparator` and CLI (`scripts/run-evaluation.ts`) to enable automated regression testing on prompt and model updates.

### Consequences
- **Positive**:
  - Deterministic defense against AI hallucinations and format drift.
  - Zero-trust architecture where all AI output is typed and verified before database persistence.
  - Objective, reproducible regression testing for continuous AI improvement.
- **Negative**:
  - Prompt updates require evaluation runs to ensure no regression.
- **Mitigation**:
  - Integrate evaluation runner into testing workflows and CI pipeline with `MockAIProvider`.

---

## ADR-007: End-to-End Pipeline Orchestration & Real-Time Intelligence Dashboard

**Date**: 2026-10-08
**Status**: Accepted
**Decision by**: Architecture Team / Phase 12 Implementation

### Context
MVP phases 3 through 11 built autonomous modular engines: auth, discovery, source verification, scraping, two-tier deduplication, AI integration, and feedback analysis. We needed to unify these disconnected engines into a single automated, multi-tenant execution pipeline that spans the entire lifecycle (Discovery -> Verification -> Ingestion -> AI Analysis -> Dashboard Analytics), while safely handling zero-state onboarding and accurately updating frontend KPI metrics via React Server Components.

### Decision
1. **Pipeline Orchestrator Pattern**:
   - Establish `PipelineOrchestrator` as the central coordinator aggregating decoupled internal services.
   - Run the 13-step pipeline sequence idempotently, updating progress within `PipelineRunSummary` output.
   - Wrap external providers (`SearchProvider`, `AIProvider`, `ScrapingProvider`) behind interfaces for seamless swapping of live and mock deterministic implementations per environment (Dev, Test, Prod).
2. **Deterministic UI Dashboards**:
   - Implement real-time analytical SQL queries inside `DashboardService`, completely eliminating mocked interface data.
   - Enforce rigorous Supabase RLS mapping for every analytical read.
   - Aggregate sentiment scores, topics, ingestion/discovery states, and surface identified "churn risks / severe feedback" components in the dashboard.
3. **Comprehensive E2E Integration Testing**:
   - Ensure a completely deterministic end-to-end integration test of the 13-step sequence using in-memory mock adapters without requiring an actual live database, guaranteeing fast resilient CI pipeline performance while fully simulating the expected Supabase query behaviors (`tests/e2e/mvp-pipeline.test.ts`).

### Consequences
- **Positive**:
  - Validates the architectural integration of the entire system.
  - Transforms disjointed components into a cohesive analytical pipeline.
  - Dashboards now reflect live, true intelligence drawn directly from ingested records.
- **Negative**:
  - Mocking the chained structure of Supabase queries for the in-memory test increases the complexity of E2E mocks.
- **Mitigation**:
  - Isolate the Supabase mock logic carefully inside the test setup, or transition to a containerized testing database in the future.

---

## Template for Future ADRs

```markdown
## ADR-NNN: [Title]

**Date**: YYYY-MM-DD
**Status**: Proposed | Accepted | Deprecated | Superseded
**Decision by**: [Who decided]

### Context
What is the issue we're addressing?

### Decision
What did we decide?

### Alternatives Considered
What else could we have done?

### Consequences
What are the results of this decision?
```
