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
