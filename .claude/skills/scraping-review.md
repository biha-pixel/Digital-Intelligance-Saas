---
name: scraping-review
description: Review web scraping implementation for security and ethics
---

# Scraping Review

Review web scraping implementations for security, ethics, and reliability.

## When to Use
- Before deploying scraping features
- When adding new scraping targets
- After modifying URL handling
- When reviewing scraping-related code

## Security Review

### SSRF Prevention (Critical)
```typescript
// Check: Is URL validation implemented?
// Every user-provided URL must be validated before fetching

// ❌ VULNERABLE
const response = await fetch(userProvidedUrl);

// ✅ SECURE
const validatedUrl = validateUrl(userProvidedUrl);
const response = await fetch(validatedUrl.href);
```

**Checklist**:
- [ ] HTTP/HTTPS only (no `file://`, `ftp://`, `data:`)
- [ ] Localhost blocked (127.0.0.1, ::1, localhost)
- [ ] Internal IPs blocked (10.x, 172.16-31.x, 192.168.x)
- [ ] DNS rebinding considered
- [ ] Redirects validated
- [ ] URL validation applied before every fetch

### Content Safety
- [ ] Scraped content treated as untrusted
- [ ] No direct HTML rendering without sanitization
- [ ] No execution of scraped JavaScript
- [ ] Content sanitized before display
- [ ] Content validated before processing

## Ethics Review

### Platform Respect
- [ ] robots.txt checked and respected
- [ ] Rate limiting implemented
- [ ] Proper User-Agent header set
- [ ] No CAPTCHA bypass attempts
- [ ] No authentication bypass
- [ ] No access control circumvention
- [ ] Official APIs used when available

### Data Handling
- [ ] Only public information scraped
- [ ] No PII extraction without consent
- [ ] No customer identity inference beyond what's reasonable
- [ ] Data retention policies defined
- [ ] Source attribution maintained

## Reliability Review

### Error Handling
- [ ] Timeout handling (30s default)
- [ ] Network error handling
- [ ] HTTP error code handling (429, 503, etc.)
- [ ] Partial content handling
- [ ] Invalid HTML handling

### Retry Logic
- [ ] Exponential backoff implemented
- [ ] Maximum retry count defined
- [ ] Retryable vs non-retryable errors distinguished
- [ ] Failed jobs tracked in database
- [ ] User notified of failures

### Rate Limiting
- [ ] Per-domain rate limiting
- [ ] Global rate limiting
- [ ] Backoff on 429 responses
- [ ] Queue management for batch scraping

## Code Review Checklist

```typescript
// 1. URL validation at entry point
validateUrl(userUrl); // Must be first operation

// 2. Rate limiter check
await rateLimiter.acquire(domain);

// 3. robots.txt check
const allowed = await checkRobotsTxt(url);
if (!allowed) throw new Error('Blocked by robots.txt');

// 4. Fetch with timeout
const response = await fetch(url, {
  signal: AbortSignal.timeout(30000),
  headers: { 'User-Agent': 'YourApp/1.0' },
});

// 5. Content size limit
const content = await response.text();
if (content.length > MAX_CONTENT_SIZE) {
  throw new Error('Content exceeds size limit');
}

// 6. Store as untrusted
await storeScrapedContent({
  url,
  content, // Raw, untrusted
  scrapedAt: new Date(),
  tenantId: auth.uid(),
});
```

## Common Mistakes to Check

❌ No URL validation → SSRF vulnerability
❌ No rate limiting → getting IP blocked
❌ No timeout → hung requests
❌ Trusting scraped HTML → XSS
❌ Bypassing CAPTCHA → ethics violation
❌ No retry logic → silent data loss
❌ Hard-coded User-Agent → getting blocked