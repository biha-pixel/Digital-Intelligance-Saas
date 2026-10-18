# Customer Experience Intelligence SaaS (CXPulse) — Complete Codebase Audit Report

## 1. Executive summary
CXPulse is a commercial software-as-a-service (SaaS) platform engineered for customer experience (CX) intelligence. It combines multi-tenant Supabase PostgreSQL storage (protected by Row Level Security), Next.js 16 App Router architecture, a modular web crawling and source verification engine via Crawl4AI, and an LLM-powered intelligence pipeline backed by the OmniRoute AI Gateway.

### Principal Strengths
- **Rigorous Multi-Tenancy & Security**: `supabase/schema.sql` implements tenant isolation through `organization_members` role mapping and strict RLS policies across all operational tables.
- **Robust AI Gateway Abstraction**: Decoupled AI provider interface (`src/lib/ai/provider.ts`) with `OmniRouteAdapter` (`src/lib/ai/adapters/omniroute-adapter.ts`) and `MockAIProvider` (`src/lib/ai/adapters/mock-adapter.ts`), featuring Zod schema validation (`src/lib/analysis/schemas.ts`), retry mechanisms (`src/lib/ai/retry.ts`), and evaluation frameworks (`src/lib/analysis/eval/evaluator.ts`).
- **Advanced Scraping & SSRF Defense**: `src/lib/scraping/` includes Crawl4AI integration (`src/lib/scraping/crawl4ai-client.ts`), robust robots.txt compliance (`src/lib/scraping/robots.ts`), rate-limiting (`src/lib/scraping/rate-limiter.ts`), and multi-layer SSRF defense (`src/lib/security/ssrf.ts`).
- **Data Hygiene & Deduplication**: Two-tier deduplication engine (`src/lib/feedback/deduplication.ts`) and ingestion pipeline (`src/lib/feedback/ingestion.ts`) prevent redundant feedback processing.

### Most Important Gaps
- **Billing & Monetization**: Subscription tiers are defined in database schemas (`plan_tier` enum), but checkout, payment processing webhooks (Stripe/LemonSqueezy), and quota enforcement middleware are not yet fully operational in code.
- **External Channel Integrations**: Direct integrations for WhatsApp and business email ingestion are currently placeholders or missing.
- **Production Environment Provisioning**: Live deployment configuration and automated CI/CD pipelines require final provisioning.

---

## 2. Technology stack and architecture

### Discovered Stack
- **Frontend Framework**: Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4, shadcn/ui components (`src/components/ui/`).
- **Backend Architecture**: Next.js API Routes (`src/app/api/`), server actions (`src/lib/actions/`), and background workers (`src/lib/queue/worker.ts`).
- **Database & Auth**: Supabase PostgreSQL with RLS, Supabase SSR client (`src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`), and Supabase Auth.
- **AI Gateway**: OmniRoute (abstracted via `src/lib/ai/provider.ts`), Zod schema validation.
- **Web Crawling & Scraping**: Crawl4AI Python/Node client wrapper (`src/lib/scraping/crawl4ai-client.ts`), platform extractors (`src/lib/scraping/extractors/`).
- **Testing & Quality**: Vitest (`tests/`), TypeScript (`tsc --noEmit`).

### Architecture Diagram & Request Flow
```
[Client / Browser]
       │
       ▼
[Next.js App Router / Middleware] (Session & Auth Check)
       │
       ├─────────────────────────┐
       ▼                         ▼
[Server Actions / API Routes]   [Supabase PostgreSQL + RLS]
       │
       ├─────────────────────────┬─────────────────────────┐
       ▼                         ▼                         ▼
[Crawl4AI Scraping Engine]  [OmniRoute AI Gateway]   [Feedback Deduplication]
  (SSRF Defenses &          (Zod Schema Validation   (Two-Tier Ingestion &
   Robots Compliance)        & Fallbacks)             Analysis Pipeline)
```

---

## 3. Current implementation matrix

| Feature | Status | Code evidence | What works today | Missing work or limitations |
| :--- | :--- | :--- | :--- | :--- |
| **Authentication & Sessions** | **Implemented** | `src/lib/supabase/client.ts`, `src/app/(auth)/login/page.tsx` | Supabase Auth login, signup, session management | Social OAuth providers (Google/GitHub) unconfigured |
| **Multi-Tenant RLS** | **Implemented** | `supabase/schema.sql`, `src/lib/supabase/server.ts` | Tenant isolation via organization membership policies | Cross-tenant sharing workflows |
| **Company Discovery & Search** | **Implemented** | `src/lib/discovery/service.ts`, `src/lib/discovery/providers/serper.ts` | Serper integration and discovery candidate matching | Automated continuous background discovery |
| **Web Crawling & Extraction** | **Implemented** | `src/lib/scraping/crawl4ai-client.ts`, `src/lib/scraping/extractors/` | Crawl4AI wrapper, robots.txt, rate limiter, extractors | Live browser automation execution without sandbox |
| **AI Analysis & Sentiment** | **Implemented** | `src/lib/ai/adapters/omniroute-adapter.ts`, `src/lib/analysis/engine.ts` | OmniRoute client, Zod structured output validation, sentiment & intent extraction | Cost tracking dashboard |
| **Feedback Deduplication** | **Implemented** | `src/lib/feedback/deduplication.ts`, `src/lib/feedback/ingestion.ts` | Two-tier hashing and similarity matching | Cross-source fuzzy duplicate resolution |
| **Dashboard UI & Navigation** | **Implemented** | `src/app/(app)/dashboard/page.tsx`, `src/components/dashboard/` | Core navigation, sidebar, org switcher, analytics views | Advanced real-time WebSocket updates |
| **Billing & Stripe Checkout** | **Missing** | Database schema `plan_tier` exists | Plan enums and tiers defined in schema | Stripe/LemonSqueezy checkout and webhook verification |
| **WhatsApp / Email Ingestion** | **Missing** | None | Schema support for external sources | Channel connectors and webhook ingestion handlers |

---

## 4. Existing data model

### Core Database Entities (`supabase/schema.sql`)
1. **`profiles`**: User profile metadata synced with `auth.users` (`id`, `email`, `full_name`, `avatar_url`).
2. **`organizations`**: Tenant root entity (`id`, `name`, `slug`, `plan`, `status`, `owner_user_id`).
3. **`organization_members`**: RBAC mapping (`organization_id`, `user_id`, `role` enum: `owner`, `admin`, `analyst`, `viewer`).
4. **`company_profiles`**: Monitored company entity (`organization_id`, `company_name`, `primary_domain`, `aliases`, `social_handles`).
5. **`sources`**: Discovered review platforms and web touchpoints (`company_id`, `source_type`, `source_status`, `ownership`, `verification_status`).
6. **`monitoring_targets`**: Active scraping schedules and configurations.
7. **`ingestion_runs`**: Execution logs for data collection batches (`status`, `items_collected`, `error_message`).
8. **`feedback_items`**: Standardized customer feedback (`organization_id`, `source_id`, `content`, `sentiment`, `intent`, `author`, `rating`).
9. **`analyses` & `insights`**: AI-derived sentiment breakdowns, root-cause summaries, and actionable recommendations.
10. **`alert_rules` & `alerts`**: Threshold monitoring and notification dispatch logs.

### Schema Gaps
- Subscription invoice and payment history tables are currently absent.
- Audit logging table for administrative actions requires expansion.

---

## 5. End-to-end workflows

1. **User Onboarding & Organization Setup**:
   - Entry: `src/app/(auth)/signup/page.tsx` → Supabase Auth creates user.
   - Profile creation and organization provisioning via `src/lib/actions/company-profile.ts` and onboarding wizard (`src/components/onboarding/onboarding-wizard.tsx`).
2. **Source Discovery & Scraping**:
   - Entry: `src/app/api/scraping/trigger/route.ts` or discovery engine (`src/lib/discovery/service.ts`).
   - Execution: Crawl4AI client fetches target URL with SSRF checks (`src/lib/security/ssrf.ts`) and rate limiting (`src/lib/scraping/rate-limiter.ts`).
3. **Feedback Ingestion & AI Analysis**:
   - Entry: `src/lib/feedback/ingestion.ts` → deduplication check (`src/lib/feedback/deduplication.ts`).
   - AI Processing: `src/lib/analysis/engine.ts` calls `getDefaultAIProvider()` (OmniRoute) with Zod-validated schemas (`src/lib/analysis/schemas.ts`).
4. **Dashboard Visualization**:
   - Entry: `src/app/(app)/dashboard/page.tsx` queries Supabase with RLS context to display sentiment trends, feedback items, and insights.

---

## 6. AI, crawling, and integrations

- **AI Provider**: `OmniRouteAdapter` (`src/lib/ai/adapters/omniroute-adapter.ts`) successfully interfaces with the OmniRoute AI Gateway, enforcing Zod validation and robust error handling.
- **Web Crawling**: Crawl4AI provider (`src/lib/scraping/crawl4ai-client.ts`) and platform-specific extractors (`src/lib/scraping/extractors/`) handle Trustpilot, Yelp, Google Maps, Reddit, and generic web pages.
- **Mock Fallback**: `MockAIProvider` enables fully offline testing and development without hitting live API endpoints.

---

## 7. Security and privacy findings

1. **Row Level Security (RLS)**: **Low Risk / Well Implemented**. All primary tables enforce tenant isolation policies tied to `organization_members`.
2. **SSRF Protection**: **Low Risk / Well Implemented**. `src/lib/security/ssrf.ts` actively validates and restricts URLs from hitting private network ranges and loopback addresses during crawling.
3. **Input Validation**: **Low Risk**. Zod schemas are enforced across API endpoints, feedback ingestion, and AI JSON responses.
4. **Environment Secrets**: **Low Risk**. API keys are strictly server-side (`process.env.OMNIROUTE_API_KEY`, Supabase service role keys).

---

## 8. Reliability, tests, and deployment

- **Test Suite**: Vitest tests (`tests/e2e/mvp-pipeline.test.ts`) validate end-to-end pipeline orchestration.
- **Type Checking**: Strict TypeScript configuration (`tsconfig.json`) verified via `tsc --noEmit`.
- **Error Handling**: Custom error classes in `src/lib/scraping/errors.ts` and `src/lib/ai/errors.ts` ensure graceful failure recovery.

---

## 9. Technical debt and architecture problems

- **Client-Side vs Server-Side State**: Minor state synchronization considerations during multi-step onboarding wizard flows.
- **Background Job Scalability**: Current queue worker (`src/lib/queue/worker.ts`) relies on application-level processing rather than a distributed queue broker (e.g., BullMQ/Redis), which is acceptable for MVP scale.

---

## 10. Prioritized implementation roadmap

- **P0**: Finalize production environment variable configurations and secure secret management.
- **P1**: Implement Stripe subscription checkout and webhook verification handlers.
- **P2**: Expand automated background discovery and scheduled cron execution for ingestion runs.
- **P3**: Add advanced predictive trend analysis and multi-channel notification webhooks (Slack/Discord/Email).

---

## 11. The next five implementation tasks

1. **Stripe Billing Integration**: Implement billing checkout session creation and webhook signature verification (`/api/webhooks/stripe`).
2. **Automated Cron Scheduling**: Wire Vercel Cron jobs (`vercel.ts`) to trigger periodic source monitoring and ingestion runs.
3. **Enhanced Notification Dispatch**: Implement email/webhook alert dispatchers for critical negative feedback detection.
4. **Dashboard Export Features**: Add CSV/PDF export capabilities for customer feedback reports and analytics.
5. **Real-Time Subscription Updates**: Integrate Supabase Realtime channels for live dashboard metric updates.

---

## 12. Outstanding questions and unknowns

- Live API rate limits for OmniRoute and Crawl4AI under concurrent production load.
- Specific webhook delivery guarantees for third-party review platform updates.

---

## 13. Repository reference map

- `src/app/`: Next.js App Router pages and API routes.
- `src/lib/ai/`: OmniRoute adapter and AI provider abstractions.
- `src/lib/scraping/`: Crawl4AI client, extractors, robots.txt, and SSRF defenses.
- `src/lib/analysis/`: Sentiment, intent, batch processor, and evaluation frameworks.
- `src/lib/feedback/`: Ingestion and two-tier deduplication engine.
- `src/lib/supabase/`: Supabase client factories and server helpers.
- `supabase/schema.sql`: Unified production schema and RLS policies.
- `tests/`: End-to-end and unit tests.
