---
name: security-audit
description: Security-focused code review for common vulnerabilities
---

# Security Audit

Systematic security review to identify vulnerabilities before deployment.

## When to Use
- Before deploying to production
- After adding new API endpoints
- When handling user input
- When integrating external services
- When changing authentication/authorization

## Audit Areas

### 1. Authentication
```bash
# Find unprotected API routes
grep -r "export async function" app/api/ | grep -v "auth"
```

- [ ] All protected routes check authentication
- [ ] No routes skip auth unintentionally
- [ ] Token validation proper
- [ ] Session management secure
- [ ] Password handling correct

### 2. Authorization / RLS
```bash
# Check all tables have RLS
grep -r "ENABLE ROW LEVEL SECURITY" supabase/migrations/
grep -r "CREATE TABLE" supabase/migrations/
# Every CREATE TABLE should have corresponding RLS
```

- [ ] RLS enabled on every tenant-scoped table
- [ ] Policies for all CRUD operations
- [ ] Tenant isolation verified
- [ ] No RLS bypass (service role key on client)
- [ ] Authorization tested with multiple tenants

### 3. Input Validation
```bash
# Find API routes without Zod validation
grep -r "req.json()" app/api/ -l
grep -r "z.object" app/api/ -l
# Compare lists - routes with req.json() should have z.object
```

- [ ] All API inputs validated with Zod
- [ ] Query parameters validated
- [ ] URL parameters validated
- [ ] File uploads validated (type, size)
- [ ] JSON bodies validated

### 4. Secrets Management
```bash
# Check for hardcoded secrets
grep -r "sk_\|pk_live\|apikey\|secret" --include="*.ts" --include="*.tsx"
grep -r "eyJ" --include="*.ts" --include="*.tsx"  # JWT tokens

# Check .gitignore
cat .gitignore | grep -i "env"

# Check client code for server secrets
grep -r "process.env" --include="*.tsx" | grep -v "NEXT_PUBLIC"
```

- [ ] No secrets in source code
- [ ] `.env.local` in .gitignore
- [ ] No secrets in git history
- [ ] `NEXT_PUBLIC_*` only for client-safe values
- [ ] Service keys only on server side

### 5. SSRF Prevention
```bash
# Find URL fetching
grep -r "fetch(" --include="*.ts" | grep -v "node_modules"
grep -r "axios\|request\(\|http.get" --include="*.ts"
```

- [ ] All user-provided URLs validated
- [ ] Internal IPs blocked
- [ ] Only HTTP/HTTPS allowed
- [ ] Redirect following restricted
- [ ] DNS rebinding considered

### 6. XSS Prevention
```bash
# Find dangerous rendering
grep -r "dangerouslySetInnerHTML" --include="*.tsx"
grep -r "innerHTML" --include="*.ts" --include="*.tsx"
```

- [ ] No unsanitized HTML rendering
- [ ] Scraped content sanitized (DOMPurify)
- [ ] User input escaped
- [ ] React's default escaping relied upon

### 7. External Services
```bash
# Find external API calls
grep -r "fetch(" --include="*.ts" | grep "http"
```

- [ ] Webhook signatures verified
- [ ] API responses validated
- [ ] Rate limiting implemented
- [ ] Connector abstraction used
- [ ] Error messages don't leak info

### 8. AI Security
- [ ] AI output schema validated
- [ ] Prompt injection mitigated
- [ ] User data handling in prompts reviewed
- [ ] Cost limits enforced
- [ ] AI hallucinations not presented as fact

## Severity Levels

### 🔴 Critical
Immediate security risk. Fix before deploying.
- Missing RLS on tables with user data
- SSRF vulnerability
- Secrets in client code
- Missing authentication on API routes

### 🟠 High
Significant risk. Fix soon.
- Missing input validation
- Incomplete RLS policies
- Webhook signature not verified
- No rate limiting

### 🟡 Medium
Should be addressed. Plan fix.
- Missing CORS configuration
- Verbose error messages
- No brute force protection
- Missing security headers

### 🟢 Low
Best practice improvements.
- CSP headers not configured
- No security logging
- Missing audit trail

## Report Format

```markdown
## Security Audit Report

**Date**: 2024-01-15
**Scope**: All API routes and database tables
**Auditor**: Security Agent

### Summary
- 🔴 Critical: 0
- 🟠 High: 2
- 🟡 Medium: 3
- 🟢 Low: 1

### Findings

#### [HIGH] Missing input validation on /api/analyze
**File**: `app/api/analyze/route.ts:15`
**Issue**: Request body not validated with Zod
**Risk**: Malformed input could cause runtime errors
**Fix**: Add Zod schema validation
```typescript
const schema = z.object({ url: z.string().url() });
const data = schema.parse(await req.json());
```

#### [HIGH] RLS missing on scrape_results table
**File**: `supabase/migrations/xxx.sql`
**Issue**: Table created without RLS policies
**Risk**: Cross-tenant data access
**Fix**: Enable RLS and create policies
```