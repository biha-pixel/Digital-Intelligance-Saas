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
