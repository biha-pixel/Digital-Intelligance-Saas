# Customer Experience Intelligence SaaS

## Project Overview
Commercial SaaS platform for customer experience intelligence, combining web scraping, AI analysis, and multi-tenant architecture.

## Technology Stack
- **Frontend**: Next.js, React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API routes, TypeScript
- **Database**: Supabase PostgreSQL with Row Level Security (RLS)
- **Authentication**: Supabase Auth
- **AI Gateway**: OmniRoute (NOT OpenRouter)
- **Web Scraping**: Crawl4AI
- **Mobile**: Expo / React Native (future phase)

## Core Principles

### Security First
- Supabase RLS is mandatory for all tenant isolation
- Server secrets must never reach client code
- All external input is untrusted
- Scraped content is untrusted
- URLs must be protected against SSRF
- AI output must be schema validated
- Customer identity must not be inferred recklessly

### Scraping Ethics
- Do not bypass CAPTCHA, authentication, access controls or platform restrictions
- Use official APIs where appropriate
- Respect robots.txt and rate limits
- Implement proper backoff and retry logic

### Development Standards
- Strict TypeScript with no `any` types
- No unnecessary dependencies
- Provider abstractions at infrastructure boundaries
- External APIs must use connector abstractions
- Webhook processing must be idempotent
- Background operations must be retryable

## Agent System
Use specialized agents for focused work:
- `teacher` - Educational guidance with explanations
- `architect` - System design and architectural decisions
- `backend` - API and business logic implementation
- `database` - Schema design, migrations, RLS policies
- `discovery` - Codebase exploration and analysis
- `scraping` - Crawl4AI integration and web scraping
- `ai` - OmniRoute integration and AI feature implementation
- `integrations` - Third-party API connectors
- `security` - Security review and vulnerability assessment
- `frontend` - UI components and client-side logic
- `qa` - Testing strategy and test implementation
- `devops` - Deployment, Docker, CI/CD

## Skills
Learning-oriented skills to encourage best practices:
- `/learn-before-code` - Explain concepts before implementation
- `/architecture-review` - Review architectural decisions
- `/database-review` - Review schema and RLS policies
- `/discovery-review` - Explore and understand codebase
- `/scraping-review` - Review scraping implementation
- `/ai-evaluation` - Evaluate AI integration patterns
- `/security-audit` - Security-focused code review
- `/phase-completion` - Review phase completion criteria
- `/production-readiness` - Pre-deployment checklist

## Learning Mode
When implementing new features:
1. Explain the concept and data flow first
2. Show relevant file structure
3. Explain design decisions and alternatives
4. Implement with clear comments
5. Explain testing approach
6. Highlight common mistakes
7. Provide a small learning exercise when useful

## Environment Variables
Never commit:
- `.env.local` (local development)
- `.env.production` (production secrets)

Track templates:
- `.env.example` (safe to commit)

## Git Workflow
- Branch naming: `feature/description`, `fix/description`, `docs/description`
- Commit messages: Clear, imperative mood
- No direct commits to `main`

## Documentation
Maintain in `docs/`:
- `learning-log.md` - What you learned during development
- `architecture-decisions.md` - ADRs and design rationale
- `roadmap.md` - Feature roadmap and phase tracking

## Current Phase
**Phase 0: Environment Setup**
- Establishing development environment
- Creating agent and skill structure
- Setting up documentation framework
