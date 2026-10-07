---
name: production-readiness
description: Pre-deployment checklist and production readiness validation
---

# Production Readiness

Comprehensive checklist to validate before deploying to production. Do not invent production readiness — verify each item systematically.

## When to Use
- Before first production deployment
- Before major feature releases
- After significant infrastructure changes
- Periodically for ongoing validation

## Readiness Checklist

### 🔐 Security

#### Authentication & Authorization
- [ ] Supabase Auth configured
- [ ] All protected routes require authentication
- [ ] RLS enabled on ALL tenant-scoped tables
- [ ] RLS policies tested with multiple tenants
- [ ] Session management configured
- [ ] Token refresh handling implemented

#### Input Validation
- [ ] All API inputs validated with Zod
- [ ] SQL injection prevented (parameterized queries)
- [ ] XSS prevented (React escaping + DOMPurify for HTML)
- [ ] SSRF prevention on URL inputs
- [ ] File upload validation (if applicable)

#### Secrets
- [ ] No secrets in git repository
- [ ] No secrets in git history
- [ ] Environment variables for all secrets
- [ ] Different secrets per environment
- [ ] Service keys only on server
- [ ] `.env.local` in .gitignore

#### Headers
- [ ] CORS configured correctly
- [ ] Security headers set (HSTS, X-Frame-Options)
- [ ] CSP headers configured
- [ ] Rate limiting on API routes

### 📊 Database

#### Schema
- [ ] Migrations tested and reversible
- [ ] Foreign keys with appropriate cascading
- [ ] Indexes on frequently queried columns
- [ ] Index on tenant_id for ALL tenant tables
- [ ] Constraints validate business rules

#### RLS
- [ ] Enabled on every tenant-scoped table
- [ ] Policies for SELECT, INSERT, UPDATE, DELETE
- [ ] Tested: users can't access other tenants
- [ ] Tested: users can't insert with wrong tenant_id
- [ ] Performance acceptable with RLS

#### Data
- [ ] Backup strategy configured
- [ ] Point-in-time recovery enabled (Supabase)
- [ ] Data retention policy defined
- [ ] PII handling documented

### 🖥️ Application

#### Build
- [ ] TypeScript strict mode, no errors
- [ ] No lint warnings
- [ ] No unused dependencies
- [ ] Bundle size acceptable
- [ ] Build completes without errors

#### Error Handling
- [ ] All API routes have error handling
- [ ] Client-friendly error messages (no stack traces)
- [ ] Structured error logging
- [ ] Error tracking configured (Sentry or similar)

#### Performance
- [ ] Core Web Vitals acceptable
- [ ] Database queries optimized
- [ ] Images optimized (next/image)
- [ ] Code splitting configured
- [ ] API response times acceptable (<500ms)

#### Testing
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Critical user flows tested
- [ ] Edge cases covered
- [ ] Test coverage on critical paths

### 🔗 External Services

#### OmniRoute (AI)
- [ ] API key configured
- [ ] Schema validation on all AI outputs
- [ ] Error handling for API failures
- [ ] Retry logic with backoff
- [ ] Cost limits configured
- [ ] Rate limiting

#### Crawl4AI (Scraping)
- [ ] Docker container running
- [ ] Health check configured
- [ ] URL validation prevents SSRF
- [ ] Rate limiting per domain
- [ ] Timeout handling
- [ ] Retry logic

#### Supabase
- [ ] Production project configured
- [ ] Production URL and keys set
- [ ] Migrations applied
- [ ] RLS policies active
- [ ] Connection pooling configured

### 🚀 Deployment

#### Infrastructure
- [ ] Production environment configured
- [ ] Domain configured and SSL active
- [ ] CDN configured (Vercel handles this)
- [ ] Docker services running
- [ ] Health checks implemented

#### CI/CD
- [ ] GitHub Actions pipeline working
- [ ] Tests run on every PR
- [ ] Deployment automated
- [ ] Preview deployments for PRs

#### Monitoring
- [ ] Application monitoring configured
- [ ] Error tracking active
- [ ] Uptime monitoring configured
- [ ] Performance metrics tracked
- [ ] Alerts configured for errors

#### Operations
- [ ] Rollback procedure documented
- [ ] Incident response plan defined
- [ ] On-call responsibilities defined
- [ ] Runbook for common issues

### 📚 Documentation

- [ ] README is current and accurate
- [ ] Deployment guide complete
- [ ] API documentation available
- [ ] Architecture decisions documented
- [ ] Environment setup guide
- [ ] Troubleshooting guide

## Verification Process

### 1. Run All Checks
```bash
# Build check
npm run build

# Type check
npm run type-check

# Lint
npm run lint

# Tests
npm test -- --coverage

# Security
npm audit
```

### 2. Manual Testing
- [ ] Login flow works
- [ ] Core user journey works end-to-end
- [ ] Error states display correctly
- [ ] Mobile responsive
- [ ] Accessibility check

### 3. Load Testing (if applicable)
- [ ] API can handle expected load
- [ ] Database performs under load
- [ ] No memory leaks
- [ ] Rate limiting works correctly

## Report Format

```markdown
## Production Readiness Report

**Date**: 2024-01-15
**Version**: 1.0.0
**Reviewer**: DevOps Agent

### Summary
- 🟢 Ready: 18/22 items
- 🟡 Pending: 3 items
- 🔴 Blocking: 1 item

### Blocking Issues
1. [CRITICAL] Missing RLS on api_keys table

### Pending Items
1. [MEDIUM] Load testing not completed
2. [LOW] CSP headers not configured
3. [LOW] Runbook incomplete

### Recommendation
NOT ready for production. Fix blocking issue first.
```

## IMPORTANT

Do NOT fabricate production readiness. Each item must be actually verified, not assumed. If you haven't checked it, mark it as unchecked and explain what's needed.