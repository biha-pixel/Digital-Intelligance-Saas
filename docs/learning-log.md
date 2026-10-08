# Learning Log

Track what you learn during development. Each entry should explain what you learned, why it matters, how to apply it, and common mistakes.

---

## 2026-10-07: Project Environment Setup

**What I learned**: Setting up a structured engineering environment with specialized agents, skills, and documentation frameworks creates guardrails that prevent common mistakes before they happen.

**Why it matters**: Junior developers often dive straight into coding without establishing foundations. A structured environment with clear guidelines, security rules, and review processes catches issues early.

**How to apply**:
- Use agents for focused work (e.g., `@database` for schema design, `@security` for audits)
- Run skills before major decisions (e.g., `/architecture-review` before new features)
- Document decisions in `architecture-decisions.md`
- Update this log after learning something significant

**Common mistakes**:
- Skipping the learning phase and jumping to implementation
- Not documenting decisions and forgetting why choices were made
- Not testing security controls (RLS, input validation)
- Using OpenRouter instead of OmniRoute (our AI gateway)

**Exercise**: Review the CLAUDE.md file and name three security principles from memory.

---

## 2026-10-07: Phase 1 — Multi-Tenant Architecture & Supabase SSR Auth

**What I learned**: 
1. Multi-tenant isolation at the database layer using PostgreSQL Row Level Security (RLS) is far superior to application-level `where organization_id = ...` filtering because database-level policies prevent data leakage even if application code has bugs.
2. Writing a `SECURITY DEFINER` function (`get_user_org_ids()`) avoids recursive policy queries and improves RLS evaluation performance.
3. Next.js 16 App Router SSR auth requires asynchronous cookie handling (`await cookies()`) and proper cookie proxy/middleware refresh to keep session tokens in sync without blocking edge or server execution.

**Why it matters**: A breach of tenant boundaries is a fatal flaw for any B2B SaaS. RLS guarantees that tenant data remains strictly segregated across all queries.

**How to apply**:
- Always enable RLS on every table (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`).
- Use `organization_id IN (SELECT get_user_org_ids(auth.uid()))` as the standard policy predicate.
- Isolate service-role operations (like background scrapers and queue workers) in `@/lib/supabase/admin.ts`.

---

## 2026-10-07: Phase 2 — SSRF Defense, Ethical Crawling & Concurrency-Safe Queues

**What I learned**:
1. SSRF prevention requires multi-tier validation: validating protocols (`http:`, `https:`), stripping embedded credentials, blocking non-standard ports, and resolving hostnames through DNS before verifying that resolved IP addresses do not touch private subnets (RFC 1918), loopback, link-local, or cloud metadata endpoints (`169.254.169.254`).
2. Ethical scraping requires RFC 9309 `robots.txt` compliance, honoring `Crawl-delay`, and implementing token-bucket rate limiters per domain.
3. User privacy is preserved by applying one-way cryptographic pseudonymization (`SHA-256(sourceType + ":" + name + ":" + profileUrl)`) so that no author PII is ever stored in cleartext.
4. Database-backed job queues can run concurrently without race conditions or deadlocks using PostgreSQL's `SELECT ... FOR UPDATE SKIP LOCKED`.

**Why it matters**: SaaS scrapers can easily be abused to probe internal clouds (SSRF) or violate website terms without robust defensive controls. Zero-PII ingestion ensures compliance with GDPR and privacy frameworks.

**How to apply**:
- Run `validateUrlForScraping(url)` before making any external HTTP request.
- Use `claim_next_job` RPC for worker concurrency.
- Store content hashes (`SHA-256`) to avoid duplicate ingestion runs.

---

## 2026-10-07: Phase 3 — Core Relational Schema, Multi-Tenant Database Architecture & RLS

**What I learned**:
1. **Relational Normalization vs. JSONB**: Relational sub-tables (e.g. `company_aliases`, `company_domains`, `company_locations`) are essential when rows require individual indexing, uniqueness constraints (e.g., `(organization_id, domain)`), or foreign key integrity, while JSONB is ideal for dynamic payload storage (e.g., AI sentiment breakdown, scrape metadata).
2. **PostgreSQL Row Level Security (RLS)**: RLS operates at the database kernel level, modifying the execution query plan to inject security predicates (`organization_id IN (SELECT get_user_org_ids(auth.uid()))`). This guarantees strict tenant isolation even if application-level SQL queries omit a `WHERE organization_id = ...` filter.
3. **Security Definer Function Optimization**: PostgreSQL `SECURITY DEFINER` functions (`get_user_org_ids()`) bypass RLS recursion loops during policy evaluation and execute with optimized indexed lookups on `organization_members`.
4. **Audit Logs & Immutability**: Compliance audit logs (`audit_logs`) should be append-only with strict insert policies and restricted to tenant admins (`is_org_admin()`) for read operations.

**Why it matters**: In a multi-tenant B2B SaaS, tenant data leakage is a critical vulnerability. Enforcing isolation at the database layer ensures defense-in-depth against application bugs, SQL injection flaws, and authorization bypasses.

**How to apply**:
- Enable RLS on every table immediately upon creation (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`).
- Pair `USING` (read/update/delete filter) with `WITH CHECK` (insert/update write validation) in RLS policies.
- Generate synchronized TypeScript types (`src/types/database.types.ts`) from schema migrations to enforce type safety in API handlers.

---

## 2026-10-08: Phase 4 — Authentication, Authorization & Multi-Tenant Session Management

**What I learned**:
1. **Authentication (AuthN) vs. Authorization (AuthZ)**:
   - *AuthN* answers "Who are you?" (verifying credentials, passwords, magic links, or OAuth providers to issue signed JWTs and establish identity).
   - *AuthZ* answers "What are you permitted to do?" (evaluating user roles, organization memberships, and granular resource capabilities like `org:delete` or `members:manage`).
2. **Zero-Trust Active Tenant Resolution**:
   - In a multi-tenant B2B SaaS, **never trust `organization_id` sent by client cookies or request bodies**.
   - The server inspects the client's `cxpulse_active_org_id` cookie only as an untrusted hint, queries verified `organization_members` for the authenticated `user.id`, and falls back to a valid organization if the cookie has been tampered with or points to another tenant.
3. **Hierarchical RBAC with Numerical Weights**:
   - Assigning integer weights (`owner: 40`, `admin: 30`, `member/analyst: 20`, `viewer: 10`) enables clean threshold validation (`hasMinRole(userRole, 'admin')`) preventing privilege escalation.
4. **Server vs. Browser Supabase Clients**:
   - *Browser Client (`createBrowserClient`)*: Operates in client-side React components, uses browser cookies/localStorage, and carries only the user's authenticated JWT.
   - *Server Client (`createServerClient` with `cookies()`)*: Runs in Next.js Server Components and Route Handlers, decrypts secure HttpOnly cookies, and enforces RLS in the server runtime.
   - *Admin Client (`createClient` with `SUPABASE_SERVICE_ROLE_KEY`)*: Bypasses RLS entirely; strictly isolated to trusted background workers and queue processors.

**Why it matters**: In single-tenant applications (like consumer apps or basic portfolio projects), authentication is 1:1 (`user_id = auth.uid()`). In enterprise B2B SaaS, a single user can belong to multiple organizations with completely different roles in each (e.g. `owner` at Company A, `viewer` at Company B). Robust multi-tenant session management ensures zero data cross-contamination and enforces strict permission boundaries.

**How to apply**:
- Resolve the active organization on the server using `getCurrentOrg()` in Server Components.
- Guard API routes using `requireRole('admin')` or `canPerformAction(membership.role, 'members:manage')`.
- Clean up custom session cookies (`cxpulse_active_org_id`) in `/auth/signout`.

---

## 2026-10-08: Phase 5 — Professional B2B SaaS Interface, Form State & Company Onboarding

**What I learned**:
1. **React 19 / Next.js 16 Form State & Server Actions**:
   - Progressive enhancement using Next.js Server Actions (`"use server"`) combined with React 19 `useTransition` / `useActionState` eliminates the need for manual `fetch` boilerplate and manages pending state transitions (`isPending`) natively.
   - Mutations return structured result payloads (`{ success: boolean, data?: T, error?: string, errors?: Record<string, string> }`) providing clean error mapping on both client and server boundaries.
2. **Two-Tier Validation Pattern**:
   - *Client-Side*: Interactive, instant feedback (e.g. real-time domain normalization, tag delimiters, completeness score calculation) providing an exceptional UX.
   - *Server-Side*: Authoritative Zod schema parsing inside the Server Action (`companyProfileSchema.safeParse()`). Client-side validation is never trusted on its own; server validation guarantees data integrity before database insertion.
3. **Server Components (RSC) vs. Client Components (`"use client"`)**:
   - *Server Components*: Ideal for data fetching at the page root (`/dashboard`, `/settings`, `/profile`), directly querying session context (`getCurrentUser()`, `getCurrentOrg()`) and database models with zero client JavaScript bundle overhead.
   - *Client Components*: Scoped strictly to stateful interactive elements — multi-step wizard navigation, dynamic tag inputs, collapsible tables, and client-side form controls.
4. **Optimistic UI Principles & Transactional Hazards**:
   - Optimistic updates are justified for low-risk, single-entity operations (e.g., adding a local alias tag or toggling a filter chip) where UI responsiveness is critical.
   - For multi-table relational persistence (e.g. creating/updating `company_profiles`, `company_domains`, `company_aliases`, `company_locations`, `company_social_accounts`), optimistic updates pose data corruption hazards if one step fails; multi-table mutations must rely on authoritative server confirmation and transactional database writes.
5. **Strategic Field Guidance in Onboarding**:
   - Providing in-line contextual explanations (via `InfoTooltip`) for *why* metadata is requested (e.g., domain for Trustpilot verification, aliases for Reddit/G2 keyword matching, locations for Google Maps geo-crawling) drastically increases user onboarding completion and data quality.
6. **State Completeness**:
   - Every production B2B SaaS route must handle three critical UI states: loading skeletons (`<Skeleton />`), error states with actionable retry banners (`<Alert />`), and contextual empty states with clear calls-to-action (CTAs).

**Why it matters**: Enterprise B2B SaaS products require clean state management, bulletproof data validation, and intuitive onboarding. A seamless onboarding flow directly drives data completeness, which in turn determines the accuracy of downstream AI scraping, topic extraction, and sentiment benchmarking.

**How to apply**:
- Implement reusable, accessible UI primitives (`Input`, `Textarea`, `Select`, `TagInput`, `Skeleton`, `Alert`).
- Normalize entity inputs (strip protocols/slashes with `normalizeDomain`) prior to schema validation.
- Compute a real-time `completeness_score` (0–100%) to guide users through required and optional fields.
- Perform multi-table synchronization within the active tenant scope in Supabase.

---

## 2026-10-08: Phase 6 — Core Company Discovery Engine

**What I learned**:
1. **Search Engine vs Crawler**: 
   - A *search engine* (like Google or Bing, or their APIs like Serper) maintains a massive pre-indexed database of the web and returns ranked URLs for an arbitrary query. 
   - A *crawler* (like Crawl4AI) visits a specific, known URL, fetches its HTML, and extracts structured data from it. 
   - In our pipeline, the Search Engine provides the "where" (URLs), and the Crawler provides the "what" (reviews, text).
2. **Discovery vs Crawling**: 
   - *Discovery* is the reconnaissance phase: casting a wide net (using search APIs) to find URLs that *might* be relevant to the company. 
   - *Crawling* is the ingestion phase: actually downloading the content of the confirmed URLs.
3. **Candidate Source**: A URL surfaced during the Discovery phase that has not yet been verified. It's a hypothesis ("This Trustpilot page might belong to Acme Corp").
4. **Relevance & False Positives**: Not every mention of "Acme Corp" is the Acme Corp we are looking for. A *false positive* occurs when discovery finds a page for a different company with the same name. *Relevance* measures how closely the candidate matches our specific company profile (e.g., matching the domain or industry).
5. **Entity Resolution**: The process of determining if two distinct digital footprints (e.g., a Twitter handle and a Google Maps listing) actually belong to the same real-world business entity.
6. **Canonical URLs & Duplicate Sources**: 
   - *Canonical URLs* are the normalized, definitive version of a web page URL (e.g., stripping `?utm_source=...` or standardizing path trailing slashes).
   - Establishing a canonical URL prevents *duplicate sources*, where the exact same profile is ingested twice, saving compute and preventing skewed sentiment reporting.
7. **Confidence Score**: A calculated metric (0.0 to 1.0) indicating how certain the engine is that a candidate source belongs to the target company. A 0.95 might automatically approve the source, while a 0.60 requires human review.

**Why it matters**: 
Without a robust Discovery Engine, users would have to manually find and paste the URL of every single review page, social profile, and directory listing their company has across the entire internet. This is a massive point of friction in B2B onboarding. Automating it creates a "magic" user experience. However, if the engine adds false positives (competitors' reviews), the AI sentiment insights become dangerously inaccurate.

**How to apply**:
- Separate the concepts: `SearchProvider` (abstracts the external search API) -> `DiscoveryProvider` (orchestrates queries & parsing) -> `Verification` (canonicalizes and scores).
- Never hardcode Google or Bing into the core business logic; use an adapter pattern.
- Always normalize URLs (remove query params, standardize protocols) before saving them to `source_discoveries` to prevent duplicates.
- Use multi-faceted discovery queries: `[Company Name] + [Platform]` and `[Domain] + [Platform]`.

**Common mistakes**:
- Using a crawler to search the web (horribly slow and blocked easily).
- Storing un-normalized URLs (leads to duplicate scraping of the same reviews).
- Trusting search results blindly without a confidence scoring step (results in cross-company data contamination).

---

## 2026-10-08: Phase 7 — Source Registry & Ownership Verification

**What I learned**:
1. **Source Verification & Identity**:
   - Web footprints (review listings, social profiles, directories) cannot be trusted purely because they contain a company's name. A *source identity* links a digital platform entity to a registered company profile using verified evidence.
2. **Ownership Taxonomy**:
   - `owned`: Directly controlled by the business (e.g., official website, official blog, verified Twitter/LinkedIn).
   - `official`: External platforms maintained by the company with official status (e.g., company's verified App Store listing or official Yelp business account).
   - `third-party`: Independent platforms hosting customer reviews, discussions, or commentary (e.g., Trustpilot, G2, Reddit, Capterra).
   - `uncertain`: Potential candidate requiring human review or additional verification evidence.
   - `irrelevant`: False positive or competitor profile with conflicting signals (e.g., mismatched location or distinct registered domain).
3. **Canonical URLs & Provenance**:
   - Normalizing URLs (stripping query parameters, trailing slashes, URL schemes, and standardizing hostnames) prevents duplicate scraping and duplicate feedback items.
   - *Provenance* maintains an audit trail of how a source was discovered, which search query or user action surfaced it, and all historical verification evidence.
4. **False-Positive Prevention via Multi-Signal Evidence**:
   - Cross-referencing geographic coordinates/addresses, domain links in profiles, official contact metadata, and name similarity protects against attributing competitor or namesake review pages to the user's company.

---

## 2026-10-08: Phase 8 — Self-Hosted Crawl4AI Integration & Multi-Layer SSRF Defenses

**What I learned**:
1. **Architectural Decoupling**:
   - `Application → ScrapingProvider → Crawl4AIProvider → Crawl4AI Server`: Decoupling via TypeScript interfaces ensures core business logic and pipelines are never hardcoded to Crawl4AI-specific API signatures, allowing swapping mock or alternate engines without touching application services.
2. **HTTP API, REST & Request-Response Lifecycles**:
   - REST over HTTP provides a stateless protocol with standard status codes (`200 OK`, `429 Too Many Requests`, `502/503/504 Bad Gateway / Unavailable`).
   - Using `AbortController` and signals enforces deterministic timeouts, ensuring hung connections never starve the Node.js event loop or worker pools.
3. **Resilience Engineering (Exponential Backoff with Jitter)**:
   - Transient failures (429 rate limits, 502/503/504 gateway drops, connection timeouts) are retried using $delay = base \times 2^{attempt} + jitter$. Permanent failures (400, 401, 403, 404, SSRF blocks) fail fast without retrying.
4. **Docker Network Communication**:
   - In containerized environments, `localhost` refers only to the container's loopback interface. Inter-service networking requires service hostnames (e.g., `http://crawl4ai:11235` on internal bridge networks).
5. **Multi-Layer SSRF & DNS Rebinding Defenses**:
   - Validating URLs before outbound requests blocks loopback (`127.0.0.0/8`, `::1`), RFC 1918 private subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), link-local/cloud metadata (`169.254.169.254`), non-HTTP(S) protocols (`file:`, `gopher:`, `ftp:`), and abnormal ports.
   - Performing DNS pre-resolution verifies that all resolved IP addresses are public, defending against DNS rebinding attacks.
   - Redirect chains are capped (max 5 hops) with full SSRF re-validation at every hop.
6. **Payload Bounds & Deduplication**:
   - Maximum URL lengths (2048 chars) and response body size limits (10 MB) prevent memory exhaustion and DoS attacks.
   - SHA-256 content hashing creates deterministic fingerprints for raw HTML and extracted feedback deduplication.

---

## 2026-10-08: Phase 9 — Deep Review Ingestion, Normalization & Idempotent Extraction Pipeline

**What I learned**:
1. **Extraction & Canonical Data Modeling**:
   - Extracting structured data from raw HTML requires transforming platform-specific shapes (like a Yelp `.review__09f24__card` vs a Google Maps `.jftiEf`) into a unified *Canonical Data Model* (`NormalizedFeedbackItem`).
   - Normalization applies standardization across varying inputs, unifying dates ("2 weeks ago" vs "Sep 20, 2026" to ISO-8601), standardizing float rating scales (1 to 5), and aggressively cleaning boilerplate/HTML.
2. **Strategy Pattern for Hot-Swappable Extractors**:
   - Defining a `BaseExtractor` interface allows specific implementations (`YelpExtractor`, `GoogleMapsExtractor`, `TrustpilotExtractor`) to encapsulate scraping selectors internally, while the `ExtractorRegistry` manages dispatch dynamically at runtime based on the `source_type`.
3. **Zero-PII Pseudonymization & Lineage**:
   - Hashing user identifiers (`SHA-256(sourceType + ":" + salt + ":" + authorName)`) effectively groups reviews from the same individual without committing any raw Personally Identifiable Information (PII) in plaintext to the database.
   - Preserving the `external_id` (the platform-native ID) is essential for lineage tracking, letting the pipeline correlate reviews and track state changes over time.
4. **Two-Tier Deduplication & Idempotent Extraction**:
   - *Tier 1 (In-Batch)*: Memory-buffered checks using an ES6 `Set` to prevent inserting duplicate review cards pulled from the same DOM page.
   - *Tier 2 (PostgreSQL Cross-Crawl)*: Looking up the newly extracted `content_hash` and `external_id` against the database to guarantee idempotent, side-effect-free repeated crawls. If an `external_id` matches but its `content_hash` changed, the pipeline intelligently registers it as a revised/updated review (`metrics.updatedCount`) rather than a hard failure or a blind duplicate.

**Why it matters**: A high-throughput feedback ingestion engine operates on unstructured, uncooperative external DOMs. Missing an isolation layer between crawling and database storage guarantees data corruption, unmanageable schema mutations over time, and duplicate record explosion on subsequent sweeps. The combination of uniform canonical modeling and multi-tier deduplication acts as a firewall between external platform entropy and downstream AI analytical purity.

**How to apply**:
- Decouple the DOM-parsing selectors inside concrete Strategies inherited from a standard `BaseExtractor`.
- Hash user identifiers early in the pipeline (`computeContentHash`).
- Implement the "Extract → Normalize → Buffer Dedupe → DB Cross-Check Dedupe" pipeline explicitly to ensure true idempotency.

## 2026-10-08: Phase 10 — AI Infrastructure, OmniRoute Gateway Abstraction & Structured Zero-Trust Validation

**What I learned**:
1. **AI Gateway Architecture**:
   - An AI Gateway (like OmniRoute) sits between client applications and downstream AI models (Anthropic, OpenAI, etc.). It standardizes authentication, request formatting, rate limits, multi-model routing, and unified telemetry, preventing vendor lock-in.
2. **Provider Abstraction Pattern**:
   - Defining a strict TypeScript contract (`AIProvider`) decouples application business logic from specific gateway HTTP clients. This enables hot-swapping the concrete `OmniRouteAdapter` with `MockAIProvider` for instant, offline, deterministic testing and zero-egress CI pipelines.
3. **Model Routing Tiers**:
   - Instead of hardcoding model names across features, workloads map to operational tiers:
     - `fast` (`openai/gpt-4o-mini`): Rapid classification, keyword tagging, sentiment labeling (15s timeout).
     - `standard` (`anthropic/claude-3-5-sonnet`): Customer feedback synthesis, multi-aspect thematic extraction (30s timeout).
     - `reasoning` (`anthropic/claude-3-7-sonnet`): Deep root-cause inference, executive briefings, complex trend analysis (60s timeout).
4. **API Request & Response Lifecycle**:
   - Encapsulating requests (`AIRequest`, `StructuredAIRequest`) and responses (`AIResponse`, `StructuredAIResponse`) provides structured consistency: system prompts, message history, token usage telemetry (`promptTokens`, `completionTokens`, `totalTokens`), finish reasons, and estimated cost tracking.
5. **Deterministic Timeouts with Abort Cancellation**:
   - Per-tier timeout limits and `AbortController` cancellation signals prevent upstream gateway hangs from exhausting Node.js worker pools and blocking client requests.
6. **Resilience Engineering (Exponential Backoff with Full Jitter)**:
   - Transient failures (HTTP 408, 429, 500, 502, 503, 504) are retried with exponential backoff and randomized jitter: $delay = \min(maxDelay, baseDelay \times 2^{attempt} + \text{jitter})$. Deterministic errors (400, 401, 403, 422) fail fast without retrying.
7. **Zero-Trust Structured Output & Schema Validation**:
   - LLMs generate non-deterministic text. Structured pipelines mandate JSON output (`response_format: { type: "json_object" }`), strip potential markdown code fences (` ```json `), and validate against strict Zod schemas (`safeParse`). Missing fields or invalid enum variants immediately trigger path-indexed `AIValidationError` exceptions.
8. **Prompt Versioning & Registry**:
   - Prompt templates are defined with semantic version tags (e.g. `cx-sentiment@v1.2.0`), variable placeholders (`{{variable}}` and `{variable}`), and stored in an in-memory `PromptRegistry`. This allows auditability, A/B testing, and reproducible model behavior over time.
9. **Model Metadata Catalog**:
   - Centralizing context window limits, max output tokens, token pricing, and capability flags (`supportsStructuredOutput`, `supportsVision`) allows the runtime to dynamically optimize payload sizes and compute estimated invocation costs.

**Why it matters**:
Directly invoking proprietary LLM APIs without an abstraction layer leads to severe vendor lock-in, unhandled rate-limit crashes, runaway token costs, and catastrophic runtime bugs caused by malformed or hallucinated model outputs. Building a robust AI infrastructure layer with OmniRoute, strict Zod validation, and retry mechanics forms the resilient foundation required for high-throughput customer intelligence analytics.

**How to apply**:
- Direct all LLM calls through `getAIProvider()`.
- Use `generateStructured()` with strict Zod schemas for all data extraction tasks.
- Always use `MockAIProvider` in unit tests and CI workflows.
- Store `OMNIROUTE_API_KEY` and `OMNIROUTE_BASE_URL` exclusively in server-side environment variables.

---

## 2026-10-08: Phase 11 — Feedback Analysis Engine & Automated AI Evaluation Framework

**What I learned**:
1. **Classification vs. Extraction vs. Structured Generation**:
   - **Classification**: Assigning input text to a predefined, bounded taxonomy (e.g. `SentimentEnum`, `EmotionEnum`, `IntentEnum`, `SeverityEnum`). Can be single-label (one sentiment) or multi-label (multiple thematic tags).
   - **Extraction**: Extracting specific raw entities or concise derived summaries directly grounded in the text (e.g. `complaintSummary`, `painPoints`, `topics`).
   - **Structured Generation**: Directing an LLM to generate syntactically and semantically valid JSON strictly matching a Zod schema (`FeedbackAnalysisSchema`) using JSON mode and zero-trust schema parsing.
2. **Confidence Calibration**:
   - LLMs are prone to overconfidence when predicting sentiment or classification. True calibration means when a model claims 90% confidence, it is correct 90% of the time.
   - We achieve calibration by requesting multi-dimensional confidence breakdown (`sentimentConfidence`, `intentConfidence`, `overallConfidence`) and defensively applying heuristic clamping: if an item is marked `isAmbiguous` or `isSpam`, overall confidence is automatically capped at $\le 0.65$.
3. **Deterministic vs. Probabilistic Logic**:
   - A robust AI system is a hybrid: deterministic code handles hard constraints, bounds checks, whitespace guards, and business rule enforcement, while probabilistic LLMs handle semantic nuance, tone, and empathy.
   - *Invariant Defense*: If the AI detects no complaint (`complaintDetected: false`), our post-processing logic deterministically forces `complaintSummary = null`, eliminating hallucinated inconsistency.
4. **Prompt Versioning & Traceability**:
   - Prompts are treated as version-controlled software assets registered in `PromptRegistry` (e.g. `cx-feedback-analysis@v1.0.0` and `v2.0.0`).
   - Every database record in `feedback_analyses` stores `model`, `provider`, and `prompt_version`, enabling complete auditability and lineage tracking for every customer insight.
5. **AI Evaluation (Evals)**:
   - Automated evaluation is the cornerstone of responsible AI engineering. We curated a 35-item Golden Evaluation Benchmark covering 11 critical archetypes: Positive, Negative, Neutral, Angry, Confused, Refund Requests, Feature Requests, Product Complaints, Service Complaints, Spam, and Ambiguous text.
   - For every evaluation item, the system computes classification metrics (Accuracy, Precision, Recall, F1 Score) for categorical fields, Mean Absolute Error (MAE) for continuous scores (-1.0 to 1.0), and latency/cost telemetry.
6. **Prompt & Model Regression Testing**:
   - Using `PromptComparator`, developers can run A/B benchmark comparisons between `baseline` (e.g. Claude 3.5 Sonnet @ v1.0.0) and `candidate` (e.g. Claude 3.5 Sonnet @ v2.0.0 or GPT-4o-mini).
   - The comparator outputs metric deltas ($\Delta \text{accuracy}$, $\Delta \text{F1}$, $\Delta \text{cost}$, $\Delta \text{latency}$) and pinpoints exact item regressions and improvements before any prompt change is shipped to production.
7. **Batch Processing & Concurrency Throttling**:
   - Analyzing high-volume feedback streams requires concurrency-controlled chunking (`FeedbackBatchProcessor`) to maximize throughput without exceeding upstream rate limits or starving connection pools.

**Why it matters**:
Deploying unvalidated, uncalibrated LLM pipelines into production leads to silent degradation, hallucinated data corruption, runaway API bills, and no way to verify whether a "better prompt" actually caused hidden regressions in edge cases. A strict evaluation framework transforms subjective prompt engineering into an objective, measurable science.

**How to apply**:
- Run `npx tsx scripts/run-evaluation.ts` to benchmark the feedback analysis pipeline against the golden dataset.
- Run `npx tsx scripts/run-evaluation.ts --compare` to compare baseline and candidate prompt versions with full delta reporting.
- Use `FeedbackAnalysisService.getInstance().analyzeFeedbackItem(item)` for single item analysis.
- Use `FeedbackBatchProcessor` for concurrent background queue processing.

**Common mistakes**:
- Blindly trusting LLM JSON without runtime schema validation.
- Allowing conflicting states (e.g. `complaintDetected: false` with a non-null `complaintSummary`).
- Modifying prompts in production without running regression benchmarks against golden evaluation datasets.
- Over-relying on LLM self-reported confidence without deterministic bounding.

**Exercise**:
Add a new feedback archetype (e.g. "Sarcastic Praise") to `GOLDEN_EVALUATION_DATASET` in `dataset.ts`, set the expected sentiment as `negative` and intent as `complaint`, run the evaluator via `npx tsx scripts/run-evaluation.ts`, and observe how prompt version v1 vs v2 handles complex sarcasm.

---

## 2026-10-08: Phase 12 — End-to-End Pipeline Orchestration & Real-Time Intelligence Dashboard

**What I learned**:
1. **Pipeline Orchestrator Pattern**:
   - Building a robust, multi-tenant SaaS requires orchestrating complex, asynchronous sequences (Auth $\to$ Company Resolution $\to$ Multi-Intent Discovery $\to$ Evidence-Based Verification $\to$ Safe Scraping $\to$ DOM Extraction $\to$ Zero-PII Hashing $\to$ Two-Tier Deduplication $\to$ OmniRoute AI Analysis $\to$ Relational & Analytical Persistence).
   - Establishing a central coordinator (`PipelineOrchestrator`) guarantees idempotency, graceful step degradation, and clear execution telemetry across all stages.
2. **Deterministic E2E Testing without External Flakiness**:
   - Testing multi-stage pipelines end-to-end should not depend on live network latency, unpredictable external search engines, or rate-limited third-party AI APIs.
   - Implementing in-memory mock adapters (`MockSearchProvider`, `MockAIProvider`) that adhere to the exact same interfaces as production providers enables lightning-fast, zero-egress CI/CD testing while fully validating the data lifecycle across all 13 steps.
3. **Zero-State Resilience in React Server Components**:
   - Dashboards must elegantly handle fresh tenant signups before any discovery or ingestion runs have occurred.
   - Guarding database queries against empty relations and providing intuitive zero-state UI cues (e.g. "Pending Discovery", "No Runs Yet", "Zero High-Severity Complaints Detected") ensures users are never greeted with broken layouts or blank screens.
4. **Real-Time Analytical Aggregations vs. Mock Data**:
   - Replacing hardcoded or simulated UI statistics with real PostgreSQL aggregations (`DashboardService`) computes true live KPIs (Sentiment Score, Ingested/Analyzed Feedback counts, Active Channels, Sentiment Breakdown, Top Topic Clusters, and Churn Risk alerts).
   - Binding Server Components directly to database queries backed by Supabase RLS ensures multi-tenant security without leaky client-side state.

**Why it matters**:
Disjointed micro-modules are useless until they are woven into a seamless, automated user workflow. The orchestrator bridges modular engines into a fully functional product, while live database-driven dashboards deliver immediate, actionable business intelligence to users.

**How to apply**:
- Use `PipelineOrchestrator.runFullPipeline(organizationId)` to trigger full or phased end-to-end discovery, ingestion, and AI analysis.
- Use `DashboardService.getDashboardOverview(organizationId)` to fetch consolidated analytics for server-rendered dashboards.
- Run `npx vitest run tests/e2e/mvp-pipeline.test.ts` to verify the 13-step pipeline.
- Run `npx tsx scripts/run-live-mvp.ts` for repeatable CLI demonstrations.

**Common mistakes**:
- Allowing external network calls or non-deterministic APIs to leak into E2E integration tests.
- Forgetting to handle zero-state database conditions when fresh organizations first view their analytics dashboard.
- Failing to track pipeline execution state and error boundaries across intermediate stages.

---

## Template for Future Entries

```markdown
## YYYY-MM-DD: [Topic]

**What I learned**: [Concept explanation]

**Why it matters**: [Real-world importance]

**How to apply**: 
- [Step or pattern 1]
- [Step or pattern 2]

**Common mistakes**:
- [Mistake 1]
- [Mistake 2]

**Exercise**: [Small challenge to reinforce learning]
```
