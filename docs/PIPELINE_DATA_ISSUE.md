# Pipeline Data Issue - Diagnosis & Fix

**Date**: 2026-10-20  
**Status**: ✅ Diagnosed - Root cause identified

---

## Issue Summary

The dashboard appears empty despite the pipeline running successfully with Serper discovery and OmniRoute AI analysis.

## What We Found

### ✅ Pipeline is Working
Running `scripts/check-pipeline-data.ts` revealed:

```
✅ Discoveries: 10 sources found by Serper
✅ Registered Sources: 23 sources in registry
✅ Ingestion Runs: 5 completed runs
✅ Feedback Items: 10 items extracted
✅ AI Analyses: 10 OmniRoute analyses completed
```

### ❌ But Data Quality is Wrong

**The Problem**: The scraped "feedback" is generic website content, not customer reviews:

```
Feedback Examples:
- "Guided by a rich legacy of innovation..."  (company mission)
- "© Copyright 2026. All rights reserved..."   (footer text)
- "India's leading manufacturer..."            (marketing copy)
```

**Ingestion Runs All Show**:
```
Items: 0 new, 0 duplicates
```

This means the scraper hit pages but didn't extract any **real review data**.

---

## Root Cause

### The Discovery Phase ✅ Worked
Serper correctly found:
- `https://trustpilot.com/review/tatamotors.com`
- `https://reddit.com/r/CarsIndia/comments/...`
- Reddit threads about Tata Motors
- App Store and Play Store links

### The Scraping Phase ❌ Failed
**Crawl4AI scraped the wrong pages**:
1. Instead of scraping Trustpilot review pages, it scraped `tatamotors.com` (corporate homepage)
2. The Trustpilot URLs in the registry show status `0 new items`
3. The extraction pipeline treated corporate website text as "feedback"

---

## Why This Happened

**Likely causes**:

1. **URL Following Issue**: The scraper may have followed redirects from review platform URLs back to the company's official site
2. **Extraction Schema Mismatch**: Crawl4AI's extraction schema expects a different HTML structure than review platforms provide
3. **Platform-Specific Scraping Not Implemented**: Trustpilot, Reddit, and review platforms need custom selectors/schemas, but the pipeline uses a generic extraction approach

---

## What Needs to Be Fixed

### 1. **Platform-Specific Scrapers** (High Priority)
Implement specialized extraction logic for each source type:

```typescript
// Need scrapers for:
- Trustpilot (CSS selectors for reviews)
- Reddit (JSON API or HTML parsing)
- Google Play Store (HTML structure)
- App Store (API if available)
```

### 2. **Verify Crawl4AI Configuration**
Check:
- Are we using the correct extraction schema?
- Is Crawl4AI following redirects incorrectly?
- Do we need JavaScript rendering for review platforms?

### 3. **Add Extraction Validation**
Before saving feedback items:
- Validate content length (reviews should be > 20 chars)
- Check for review-specific fields (rating, author, date)
- Reject generic website content (copyright, nav menus, etc.)

### 4. **Test With Real Review URLs**
Test scraping directly against:
```
✅ https://trustpilot.com/review/tatamotors.com
✅ https://reddit.com/r/CarsIndia/comments/1ry3n6d/...
❌ https://tatamotors.com (should not be scraped)
```

---

## Temporary Workaround

For testing the dashboard UI with real data:

1. **Manually seed review data** from a known Trustpilot page
2. **Mock a few realistic reviews** in the database
3. **Test the dashboard** to verify the UI works when data is present

---

## Next Steps

1. ✅ **Fixed the Next.js prerender warning** (added `await connection()` in layout)
2. ⏳ **Implement platform-specific scrapers** for Trustpilot, Reddit, etc.
3. ⏳ **Add extraction validation** to reject non-review content
4. ⏳ **Test end-to-end** with a real review platform URL

---

## Files Modified

- ✅ `src/app/(app)/layout.tsx` - Fixed `Date.now()` prerender warning
- ✅ `scripts/check-pipeline-data.ts` - Added database inspection script

## Related Code

- `src/lib/scraping/crawl4ai-client.ts` - Crawl4AI integration
- `src/lib/scraping/pipeline.ts` - Scraping pipeline orchestrator
- `src/lib/pipeline/pipeline-orchestrator.ts` - Main pipeline coordinator
- `src/lib/extraction/` - Extraction logic (needs review)
