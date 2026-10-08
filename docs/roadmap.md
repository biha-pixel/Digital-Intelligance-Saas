# Product Roadmap

Customer Experience Intelligence SaaS — development phases and milestones.

---

## Phase 0: Environment Setup ✅ (Current - 2026-10-07)
**Goal**: Establish the development environment and engineering system.

### Deliverables
- [x] CLAUDE.md with project rules
- [x] Agent system (12 specialized agents)
- [x] Skill system (9 learning-oriented skills)
- [x] Documentation framework
- [x] Environment audit

### Outcomes
- Development environment validated
- Engineering conventions established
- Learning framework in place
- Ready for application development

---

## Phase 1: Foundation ✅ (Completed - 2026-10-07)
**Goal**: Set up Next.js project with Supabase, authentication, and core schema.

### Deliverables
- [x] Next.js project initialization (TypeScript, Tailwind, shadcn/ui)
- [x] Supabase project setup & client abstractions (SSR cookie-based auth)
- [x] Authentication flow (sign up, sign in, sign out, callback route)
- [x] Core database schema (organizations, organization_members, company_profiles, sources, feedback_items, job_queue)
- [x] Strict RLS policies for all tables with `get_user_org_ids()` security definer
- [x] Environment variable configuration (.env.example)
- [x] Basic project layout, auth layout, and dashboard shell
- [x] Unit tests for core functions (Vitest)
- [x] TypeScript types and Zod validation schemas

### Learning Goals
- Understand Next.js App Router and Server Components
- Learn Supabase Auth integration
- Master RLS policy design
- Practice TypeScript strict mode

### Prerequisites
- Node.js 20+
- Supabase CLI installed
- GitHub repository configured
- VS Code with recommended extensions

---

## Phase 2: Scraping Infrastructure ✅ (Completed - 2026-10-07)
**Goal**: Integrate Crawl4AI and build scraping pipeline.

### Deliverables
- [x] Crawl4AI Docker setup (docker-compose.yml)
- [x] URL validation (SSRF prevention, DNS rebinding & private IP/metadata blocklist)
- [x] Scraping API endpoints (`/api/scraping/trigger`, `/api/queue/process`)
- [x] Job queue for scraping tasks (`claim_next_job` with `SELECT ... FOR UPDATE SKIP LOCKED`)
- [x] Scrape results storage (raw HTML & zero-PII normalized `feedback_items`)
- [x] Rate limiting per domain (token bucket with per-domain policies)
- [x] robots.txt checking (RFC 9309 compliance with 24-hour cache)
- [x] Retry logic with exponential backoff
- [x] Platform extractors (Trustpilot, Google Maps, Yelp, Generic Website)
- [x] Scraping unit test suite (SSRF, robots.txt, extractors)

### Learning Goals
- Docker containerization
- SSRF prevention techniques
- Job queue patterns
- Rate limiting implementation
- Ethical scraping practices

### Prerequisites
- Phase 1 complete
- Docker running
- Crawl4AI image available

---

## Phase 3: Core Relational Database Schema & Strict RLS ✅ (Completed - 2026-10-08)
**Goal**: Design and deploy relational multi-tenant PostgreSQL schema with Supabase and row-level security.

### Deliverables
- [x] Complete relational schema (16 tables: profiles, organizations, organization_members, company_profiles, company_aliases, company_domains, company_locations, company_social_accounts, sources, source_discoveries, source_verifications, monitoring_targets, feedback_items, feedback_analyses, ingestion_runs, audit_logs)
- [x] Strict Row Level Security (RLS) policies guaranteeing tenant isolation
- [x] Security Definer helper functions (`get_user_org_ids()`, `user_has_org_role()`)
- [x] Strongly-typed TypeScript database definitions (`src/types/database.types.ts`)
- [x] Comprehensive database isolation test suite verifying cross-tenant access prevention

---

## Phase 4: Multi-Tenant Auth & Server-Side RBAC Authorization ✅ (Completed - 2026-10-08)
**Goal**: Implement enterprise-grade multi-tenant authentication, session handling, and role-based access control.

### Deliverables
- [x] Full authentication flows (Signup, Signin, Signout, session verification, active cookies)
- [x] Protected route middleware and server-side RBAC wrappers (`getCurrentUser`, `getCurrentOrg`, `requireOrgAccess`)
- [x] Role hierarchy enforcement (`owner` > `admin` > `analyst` > `viewer`)
- [x] Automatic organization creation on signup and organization switcher API (`/api/organizations/switch`)
- [x] Comprehensive authentication and RBAC security test suite

---

## Phase 5: Professional B2B SaaS Interface & Company Onboarding ✅ (Completed - 2026-10-08)
**Goal**: Build an enterprise B2B SaaS interface with multi-step company onboarding and complete section pages.

### Deliverables
- [x] Interactive 4-step Company Onboarding Wizard (`/onboarding`) with real-time completeness scoring (0-100%)
- [x] Contextual strategic field guidance tooltips explaining why each metadata attribute is required
- [x] Reusable accessible UI form primitives (`Input`, `Textarea`, `Select`, `TagInput`, `Skeleton`, `Alert`)
- [x] Full dashboard section suite (`/dashboard`, `/sources`, `/monitoring`, `/feedback`, `/insights`, `/alerts`, `/reports`, `/settings`, `/profile`)
- [x] Server Action (`saveCompanyProfile`) for transactional multi-table persistence
- [x] Comprehensive onboarding validation and E2E unit test suite

---

## Phase 6: Core Company Discovery Engine & False Positive Defense ✅ (Completed - 2026-10-08)
**Goal**: Build vendor-agnostic company discovery engine, multi-intent query generation, and candidate resolution pipeline.

### Deliverables
- [x] Vendor-agnostic `SearchProvider` abstraction (`MockSearchProvider`, `SerperSearchProvider`)
- [x] Multi-intent query generator based on company profile (domain, aliases, locations, industry, social)
- [x] URL canonicalization and source classification (stripping UTM, scheme normalization, domain resolution)
- [x] Explainable multi-factor confidence scoring & entity resolution (location & domain disambiguation)
- [x] Discovery service with tenant-isolated `source_discoveries` provenance persistence
- [x] Internal Discovery Testing Lab UI at `/dashboard/admin/discovery`
- [x] Comprehensive Vitest test suite for discovery algorithms, false-positive prevention, and deduplication

---

## Phase 7: Source Registry & Ownership Verification ✅ (Completed - 2026-10-08)
**Goal**: Build the Source Registry with evidence-based verification, ownership classification, and duplicate detection.

### Deliverables
- [x] Multi-source ownership classification (`owned`, `official`, `third-party`, `uncertain`, `irrelevant`)
- [x] Evidence-based verification engine (domain matching, location cross-referencing, metadata checks, confidence scoring)
- [x] Canonical URL resolution and duplicate candidate detection
- [x] Source Registry UI (`/dashboard/sources`) with filtering, manual review actions, and verification status badges
- [x] Database migrations and RLS policies for source ownership and provenance tracking
- [x] Comprehensive test suite covering false positives, duplicate URLs, redirects, and social candidate matching

---

## Phase 8: Self-Hosted Crawl4AI Provider & SSRF Defense Integration ✅ (Completed - 2026-10-08)
**Goal**: Integrate self-hosted Crawl4AI server with clean provider abstractions and multi-layer SSRF defenses.

### Deliverables
- [x] Decoupled architecture (`Application → ScrapingProvider → Crawl4AIProvider → Crawl4AI`)
- [x] `Crawl4AIProvider` implementation supporting `healthCheck`, single-page `fetch`, and concurrent `crawl`
- [x] Multi-layer SSRF defense (RFC 1918, IPv6 ULA, loopback, cloud metadata `169.254.169.254`, DNS rebinding defense)
- [x] Resilient HTTP client with `AbortController` timeouts, exponential backoff with randomized jitter, and typed error hierarchy
- [x] Redirect chain safety with per-hop re-validation and max hop limit (5 hops)
- [x] Content safety: response size limits (10MB), URL length limits (2048 chars), deterministic SHA-256 deduplication hashing
- [x] Unit and mock integration test suites for `Crawl4AIProvider` and SSRF validation

---

## Phase 9: Deep Review Ingestion, Normalization & Idempotent Extraction Pipeline ✅ (Completed - 2026-10-08)
**Goal**: Build a rigorous extraction layer to transform raw web content into normalized, deduplicated feedback items ready for analytical storage.

### Deliverables
- [x] Canonical Data Model (`NormalizedFeedbackItem`) representing uniformly typed feedback across any platform or origin
- [x] Strategy Pattern for Extractor Engines (`BaseExtractor`, `ExtractorRegistry`, and source-specific implementations for Yelp, Maps, Reddit, etc.)
- [x] Zero-PII Pseudonymization (`SHA-256` salted author hashing) and strict boilerplate text cleaning
- [x] Two-Tier Deduplication (In-Batch memory buffering and Cross-Crawl SQL checks via `content_hash`)
- [x] Revision and lineage tracking utilizing native external IDs to detect modified feedback on subsequent sweeps
- [x] Comprehensive test suite with deterministic HTML fixtures evaluating duplicates, malformed pages, and missing authors/dates

### Learning Goals
- Canonical Data Modeling
- Software Design Patterns (Strategy)
- Idempotency & Data Pipelines
- Zero-PII compliance and hashing
- DOM abstraction with strict boundary isolation

### Prerequisites
- All previous phases complete
- Domain configured
- Production Supabase project

---

## Phase 10: AI Insights & OmniRoute Intelligent Normalization 🔲
**Goal**: Connect the extraction pipeline to AI services to automatically structure unstructured feedback (e.g. general articles) and extract themes/sentiment.
**Goal**: Build companion mobile app with Expo/React Native.

### Deliverables
- [ ] Expo project setup
- [ ] Shared API types
- [ ] Authentication flow
- [ ] Dashboard views
- [ ] Push notifications
- [ ] Offline support

### Learning Goals
- React Native / Expo fundamentals
- Shared code between web and mobile
- Push notifications
- Mobile-specific UX patterns

### Prerequisites
- Phase 6 complete
- App store accounts

---

## Notes

- Each phase must pass its completion review before starting the next
- Security review required for each phase
- Learning log updated throughout
- Architecture decisions documented as they're made
- Do not skip phases or rush to production
