# Pipeline Fixes: AI Verification + Debug Logging

## Date: 2026-10-21
## Status: Implemented & Build Passing

## Problems Identified

### 1. **Only 10/71 URLs Verified**
- Discovery found 71 URLs but only 10 passed verification
- Many discovered URLs were non-review pages (company homepages, social media profiles)
- URLs like `tatamotors.com`, `instagram.com/tatamotors` don't contain reviews

### 2. **0 Items Ingested**
- All extractions returned 0 items
- CSS selectors not matching actual HTML (Trustpilot, Reddit)
- AI fallback also returned 0 items with suspiciously high confidence (1.0)
- Possible causes:
  - Anti-bot/CAPTCHA pages
  - "No reviews yet" pages
  - Changed HTML structure

### 3. **Generic Website Extracted 13 Items, All Rejected**
- Generic extractor pulled marketing copy from tatamotors.com
- Content validator correctly rejected as non-review content
- Validation worked correctly, extraction targeted wrong content

## Solutions Implemented

### A. AI-Powered URL Verification (`src/lib/discovery/ai-url-verifier.ts`)

**Purpose**: Filter out non-review URLs BEFORE scraping to avoid wasting resources

**Features**:
- Uses OmniRoute AI (fast tier) to analyze URLs
- Determines if URL will contain reviews/feedback
- Rejects:
  - Company homepages (`tatamotors.com`)
  - Social media profiles without posts (`instagram.com/company`)
  - Category/directory pages
  - Error pages
- Accepts:
  - Review platform pages (`trustpilot.com/review/company.com`)
  - Specific social media posts (`instagram.com/p/ABC123`)
  - Reddit threads (`reddit.com/r/.../comments/...`)
  - YouTube videos with comments (`youtube.com/watch?v=...`)

**Rule-Based Fallback**: If AI fails, falls back to regex pattern matching

**Integration**: Added to scraping pipeline as first step (before SSRF/robots.txt)

### B. Debug Logging System (`src/lib/scraping/debug-logger.ts`)

**Purpose**: Save failed extractions for debugging

**Features**:
- Automatically saves HTML when extraction returns 0 items
- Saves to `.debug/scraping/` directory
- Includes:
  - Raw HTML (first 50KB)
  - Text content preview (500 chars)
  - Extraction metadata (source type, URL, timestamp)
  - HTTP status, AI confidence
- Detects:
  - Anti-bot pages (CAPTCHA, Cloudflare)
  - No-content pages ("no reviews yet", "404")

**Integration**: Called in ingestion service when extraction fails

### C. Enhanced Scraping Pipeline (`src/lib/scraping/pipeline.ts`)

**Changes**:
1. Added AI URL verification as first step
2. Logs verification decisions with reasoning
3. Continues on verification failure (doesn't block pipeline)
4. Added `skipAIVerification` option for testing

**Flow**:
```
URL → AI Verification → SSRF Check → Robots.txt → Scrape → Extract → Store
```

### D. Enhanced Ingestion Service (`src/lib/feedback/ingestion.ts`)

**Changes**:
1. Detects anti-bot pages before AI fallback
2. Detects no-content pages
3. Saves debug data when extraction fails
4. Saves debug data when AI errors occur
5. More detailed logging

## Expected Improvements

### Before:
- 71 discovered → 10 verified → 0 ingested
- No visibility into why extraction fails
- Wasting resources scraping non-review URLs

### After:
- 71 discovered → **~20-30 verified** (AI filters profiles) → **1-10+ ingested**
- Debug files show exactly what Crawl4AI returned
- Only scrape URLs that will actually have reviews
- Logs show:
  - Why URLs were rejected
  - Whether pages are anti-bot/no-content
  - What AI sees in the HTML

## Files Created

1. `src/lib/discovery/ai-url-verifier.ts` - AI URL verification
2. `src/lib/scraping/debug-logger.ts` - Debug logging system

## Files Modified

1. `src/lib/scraping/pipeline.ts` - Added AI verification step
2. `src/lib/feedback/ingestion.ts` - Added debug logging

## Next Steps

### 1. Run the Pipeline Again
```bash
npm run dev
# Trigger "Discovery and Ingestion Pipeline" from dashboard
```

### 2. Check Logs
Look for:
```
[AI Verification] https://... | shouldScrape: false, reason: "This is a company homepage"
[AI Verification] https://... | shouldScrape: true, reason: "This is a Reddit thread"
[Anti-Bot Detected] https://... appears to be blocked
[No Content] https://... appears to have no reviews yet
[Debug] Saved failed extraction to trustpilot_abc123_2026-10-21.json
```

### 3. Inspect Debug Files
```bash
ls .debug/scraping/
cat .debug/scraping/trustpilot_*.json
```

Check:
- Is HTML complete or truncated?
- Does it contain CAPTCHA text?
- Does it say "no reviews yet"?
- Are review elements present but CSS selectors wrong?

### 4. Fix Based on Debug Data

**If anti-bot pages**: Need better user-agent, headers, or proxy
**If no-content pages**: URL verification needs improvement
**If HTML has reviews but extraction fails**: Fix CSS selectors

## Testing

Build passes:
```
✓ Compiled successfully
✓ Running TypeScript
✓ Generating static pages (28/28)
```

All TypeScript errors resolved.

## Configuration

AI verification runs by default. To disable for testing:

```typescript
await runScrapingPipeline(orgId, sourceId, url, sourceType, monitoringTargetId, {
  skipAIVerification: true, // Bypass AI verification
});
```

## Cost Impact

- AI verification: ~$0.0001 per URL (fast tier)
- For 71 URLs: ~$0.007 per pipeline run
- Saves scraping costs by filtering non-review URLs early

## Security

- AI verification doesn't make network requests
- Only analyzes URL patterns and metadata
- SSRF/robots.txt checks still run after verification
