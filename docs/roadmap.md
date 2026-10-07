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

## Phase 1: Foundation 🔲
**Goal**: Set up Next.js project with Supabase, authentication, and core schema.

### Deliverables
- [ ] Next.js project initialization (TypeScript, Tailwind, shadcn/ui)
- [ ] Supabase project setup
- [ ] Authentication flow (sign up, sign in, sign out)
- [ ] Core database schema (tenants, users, projects)
- [ ] RLS policies for all tables
- [ ] Environment variable configuration
- [ ] Basic project layout and navigation
- [ ] Unit tests for core functions
- [ ] CI/CD pipeline (GitHub Actions)

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

## Phase 2: Scraping Infrastructure 🔲
**Goal**: Integrate Crawl4AI and build scraping pipeline.

### Deliverables
- [ ] Crawl4AI Docker setup
- [ ] URL validation (SSRF prevention)
- [ ] Scraping API endpoints
- [ ] Job queue for scraping tasks
- [ ] Scrape results storage
- [ ] Rate limiting per domain
- [ ] robots.txt checking
- [ ] Retry logic with backoff
- [ ] Scraping tests

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

## Phase 3: AI Analysis Pipeline 🔲
**Goal**: Integrate OmniRoute and build analysis features.

### Deliverables
- [ ] OmniRoute client integration
- [ ] AI provider abstraction
- [ ] Sentiment analysis feature
- [ ] Topic extraction feature
- [ ] Summary generation feature
- [ ] Schema validation for AI outputs
- [ ] Analysis results storage
- [ ] Error handling and retries
- [ ] Cost tracking
- [ ] AI feature tests

### Learning Goals
- AI provider abstraction patterns
- Prompt engineering
- Schema validation for AI outputs
- Cost management
- Error handling for AI services

### Prerequisites
- Phase 2 complete
- OmniRoute API key
- Analysis schemas defined

---

## Phase 4: Dashboard & Visualization 🔲
**Goal**: Build the user-facing dashboard for insights.

### Deliverables
- [ ] Dashboard layout
- [ ] Project management UI
- [ ] Data source management
- [ ] Analysis results display
- [ ] Filtering and search
- [ ] Data visualization (charts, graphs)
- [ ] Responsive design
- [ ] Accessibility compliance
- [ ] Loading and error states
- [ ] Component tests

### Learning Goals
- Server Components vs Client Components
- Data visualization with React
- Accessibility (WCAG AA)
- Responsive design with Tailwind
- State management patterns

### Prerequisites
- Phase 3 complete
- shadcn/ui configured
- Design mockups (optional)

---

## Phase 5: Integrations & Webhooks 🔲
**Goal**: Add external service integrations and webhook processing.

### Deliverables
- [ ] Connector abstraction pattern
- [ ] Email notifications
- [ ] Webhook endpoints
- [ ] Webhook signature verification
- [ ] Idempotent webhook processing
- [ ] API key management per tenant
- [ ] Integration tests

### Learning Goals
- Connector/adapter pattern
- Webhook security (signatures)
- Idempotency patterns
- API key management
- Integration testing

### Prerequisites
- Phase 4 complete
- External service accounts

---

## Phase 6: Production Hardening 🔲
**Goal**: Prepare for production deployment.

### Deliverables
- [ ] Production security audit
- [ ] Performance optimization
- [ ] Error tracking (Sentry)
- [ ] Monitoring and alerting
- [ ] Production deployment pipeline
- [ ] Rollback procedure
- [ ] Documentation complete
- [ ] Load testing
- [ ] Penetration testing basics
- [ ] Production readiness review

### Learning Goals
- Production security practices
- Performance optimization
- Monitoring and observability
- Incident response
- Production deployment

### Prerequisites
- All previous phases complete
- Domain configured
- Production Supabase project

---

## Phase 7: Mobile App (Future) 🔲
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
