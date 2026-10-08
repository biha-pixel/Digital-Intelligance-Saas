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
