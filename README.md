# Customer Experience Intelligence SaaS (CXPulse)

[![Next.js](https://img.shields.io/badge/Next.js-16.4-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?style=flat-square&logo=supabase)](https://supabase.com/)
[![Vitest](https://img.shields.io/badge/Vitest-Testing-orange?style=flat-square&logo=vitest)](https://vitest.dev/)

A commercial-grade multi-tenant Customer Experience (CX) Intelligence SaaS platform combining ethical web scraping, multi-layer SSRF security defense, and structured AI analysis via the OmniRoute gateway.

---

## Features & Architecture

- **Multi-Tenant Architecture**: Strict row-level security (RLS) policies in PostgreSQL ensuring absolute tenant data isolation backed by Supabase Auth and server-side role-based access control (RBAC).
- **Ethical Web Scraping & Ingestion**: Crawl4AI integration with automated robots.txt compliance (RFC 9309), rate limiting, and robust SSRF defenses (private IP, metadata endpoint, and DNS rebinding blocklists).
- **AI-Powered Feedback Analysis**: Structured feedback analysis, sentiment classification, intent mapping, and two-tier deduplication via OmniRoute AI Gateway.
- **Source Verification & Registry**: Automated domain discovery, source ownership verification, and evidence inspector UI.

---

## Technology Stack

- **Frontend & Backend**: Next.js (App Router), React, TypeScript, Tailwind CSS, shadcn/ui primitives.
- **Database & Auth**: Supabase PostgreSQL with Row Level Security (RLS), Supabase Auth (`@supabase/ssr`).
- **AI Gateway**: OmniRoute AI Gateway.
- **Web Scraping**: Crawl4AI.
- **Testing**: Vitest.

---

## Project Structure

```text
├── src/
│   ├── app/                  # Next.js App Router (Dashboard, API routes, Auth)
│   ├── components/           # React UI components & dashboard primitives
│   ├── lib/                  # Core business logic & service abstractions
│   │   ├── ai/               # OmniRoute AI Gateway adapter & prompts
│   │   ├── analysis/         # Feedback analysis engine & deduplication
│   │   ├── auth/             # Session handling & RBAC roles
│   │   ├── discovery/        # Company discovery engine & queries
│   │   ├── pipeline/         # End-to-end pipeline orchestrator
│   │   ├── scraping/         # Crawl4AI client, extractors & robots validator
│   │   ├── security/         # Multi-layer SSRF defense
│   │   └── sources/          # Source verification & registry service
│   └── types/                # Strongly-typed database & domain types
├── tests/                    # Vitest unit and integration test suites
├── supabase/                 # Database migrations and schema definitions
└── docs/                     # Architecture Decision Records (ADRs) & learning logs
```

---

## Getting Started

### Prerequisites

- Node.js 20+ (or Node.js 24 LTS)
- npm, pnpm, or bun
- Supabase account/project (for local or cloud PostgreSQL & Auth)

### 1. Clone the Repository

```bash
git clone https://github.com/biha-pixel/Digital-Intelligance-Saas.git
cd Digital-Intelligance-Saas
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env.local` and configure your credentials:

```bash
cp .env.example .env.local
```

Example `.env.local` configuration:

```env
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_DB_PASSWORD=your-database-password

# AI Gateway (OmniRoute)
OMNIROUTE_API_KEY=your-omniroute-api-key
OMNIROUTE_BASE_URL=https://api.omniroute.ai/v1

# Web Scraping (Crawl4AI)
CRAWL4AI_SERVICE_URL=http://localhost:11235
CRAWL4AI_API_TOKEN=your-crawl4ai-token
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Development & Testing Commands

- **Run Development Server**: `npm run dev`
- **Build for Production**: `npm run build`
- **Start Production Server**: `npm run start`
- **Type Checking**: `npm run typecheck`
- **Linting**: `npm run lint`
- **Run Test Suite**: `npm test` (Vitest)

---

## Security & Compliance

- **SSRF Defense**: All scraped URLs undergo multi-layer validation blocking private IP ranges, cloud metadata endpoints, loopback addresses, and DNS rebinding attacks.
- **Row Level Security**: Database queries are bound to tenant organization IDs enforced directly at the PostgreSQL level via Supabase RLS policies.
- **AI Output Validation**: All AI inference responses are strictly validated against Zod schemas.

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
