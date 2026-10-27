# CXPulse Discovery Step: How It Works & Search Provider Options

## Step 1: Discovery - Finding Potential Review Sources

### What Happens in Discovery?

The Discovery step automatically searches the web to find ALL places where customers might be leaving reviews about your company. It's like a detective finding all the locations where feedback exists.

**Current Flow:**
```
Company Profile (e.g., "Notion")
    ↓
Generate Search Queries (multiple searches)
    ↓
Execute Searches via SearchProvider (Mock, Serper, or other)
    ↓
Parse Results → Normalize URLs → Classify Source Types
    ↓
Deduplicate → Score Confidence → Return 5 Potential Sources
    ↓
Pass to Verification Step (validate they're real)
```

### Current Implementation: Mock Search Provider

**Right now, your system uses MockSearchProvider which:**
- Does NOT make real API calls
- Returns FAKE but realistic test data
- Perfect for development & testing
- Generates results based on query patterns

**Example: When you search for "Notion reviews":**
```
Mock Provider returns:
1. https://www.trustpilot.com/review/notion.so → "Reviews of Notion | Trustpilot"
2. https://www.g2.com/products/notion/reviews → "Notion Reviews: Details, Pricing & Features | G2"
3. https://www.capterra.com/p/12345/notion/reviews → "Notion Reviews 2026 | Capterra"
4. https://www.reddit.com/r/SaaS/comments/.../is_notion_worth_it → "Is Notion worth the price? : r/SaaS"
5. https://maps.google.com/?cid=1234567890 → "Notion Headquarters - Google Maps"
```

This is why you see "5 potential sources" - the mock provider hardcodes realistic results for testing.

---

## Available Search Providers

### 1. **Mock Search Provider** (Current)
**What it is:** Fake search results for testing
- **Cost:** FREE
- **Rate limits:** Unlimited (it's local)
- **Accuracy:** ~0% (not real web data)
- **Setup:** No API key needed
- **Use case:** Development & testing only

**Configured in:** `.env.local` (default)
```bash
SEARCH_PROVIDER=mock  # or not set (defaults to mock)
```

---

### 2. **Serper** (Paid - Best for Production)
**What it is:** Google Search results via API
- **Cost:** $5-50/month for startups (100 searches/month free tier)
- **Rate limits:** Based on plan (e.g., 100/month free)
- **Accuracy:** 95%+ (real Google results)
- **Setup:** Requires API key
- **Already integrated:** YES! Your codebase has `SerperSearchProvider`

**Pros:**
- Real Google search results
- Very accurate
- Covers ALL review sites globally
- Good free tier for testing

**Cons:**
- Paid after free tier
- Need API key

**To use Serper:**
1. Go to https://serper.dev
2. Sign up (free tier: 100 searches/month)
3. Get API key from dashboard
4. Add to `.env.local`:
```bash
SERPER_API_KEY=your_api_key_here
SEARCH_PROVIDER=serper
```

**Already coded in:** `src/lib/discovery/providers/serper.ts`

---

### 3. **Tavily Search** (Free for AI agents)
**What it is:** Search API optimized for AI
- **Cost:** FREE for AI/LLM use (paid for other uses)
- **Rate limits:** Generous for AI applications
- **Accuracy:** 90%+ (good results)
- **Setup:** Requires API key
- **Already integrated:** NO (would need to add)

**Pros:**
- Completely free for AI use
- Good accuracy
- Designed for AI agents

**Cons:**
- Need to implement (not in codebase yet)

**To use Tavily:**
1. Go to https://tavily.com
2. Sign up (free tier for AI)
3. Get API key
4. Would need to create `src/lib/discovery/providers/tavily.ts`

---

### 4. **Google Custom Search** (Limited free tier)
**What it is:** Google Search results API
- **Cost:** FREE for 100 queries/day, then $5/1000 queries
- **Rate limits:** 100/day free
- **Accuracy:** 98%+ (real Google)
- **Setup:** Need Google Cloud account + API key

**Pros:**
- Real Google results
- Can customize search

**Cons:**
- Very limited free tier (100/day)
- Need Google Cloud setup
- More complex configuration

---

### 5. **Bing Search API** (Paid)
**What it is:** Bing search results via API
- **Cost:** $0-60/month (pay as you go)
- **Rate limits:** Varies by tier
- **Accuracy:** 85-90%
- **Setup:** Requires Azure account + API key

**Pros:**
- Reliable search
- Pay only what you use

**Cons:**
- Paid (though cheap)
- Another API to manage

---

## Recommendation for CXPulse

### Development/Testing (NOW)
**Use:** MockSearchProvider
- Already integrated
- Free
- No API setup needed
- Good for testing the pipeline

### Production/Real Usage
**Recommended:** **Serper** (Best balance)
- Free tier covers small businesses (100 searches/month = ~3 companies/month)
- Upgrade when needed ($5-50/month)
- Already coded in your repo
- Very accurate results
- Simple setup

**Alternative:** **Tavily** (If free is critical)
- Completely free for AI use
- Need to implement it
- Good accuracy for AI workflows

---

## How to Switch Search Providers

### Step 1: Choose your provider
Let's say you choose **Serper**.

### Step 2: Get API key
- Visit https://serper.dev
- Sign up (free tier)
- Copy API key

### Step 3: Update `.env.local`
```bash
SEARCH_PROVIDER=serper
SERPER_API_KEY=your_key_here
```

### Step 4: Update pipeline request (frontend)
When calling the pipeline API, pass:
```json
{
  "companyProfileId": "...",
  "searchProviderType": "serper",  // Change from "mock" to "serper"
  "sourceLimit": 10
}
```

### Step 5: Test
Run the discovery pipeline → It will now use real Google search results instead of mock data

---

## What Each Search Result Becomes

After search finds a URL, here's what happens:

```
Search Result: {
  url: "https://www.trustpilot.com/review/notion.so",
  title: "Reviews of Notion | Trustpilot",
  snippet: "Check out what 1,234 people have written about Notion."
}
    ↓
URL Canonicalization: https://trustpilot.com/review/notion.so (normalized)
    ↓
Source Type Classification: "trustpilot" (detected from URL pattern)
    ↓
Confidence Evaluation:
  - Is URL valid? ✓
  - Does title mention company? ✓
  - Is domain trusted? ✓
  - Confidence score: 0.95 (95% likely a real review source)
    ↓
Candidate Source Record Created:
  {
    url: "https://www.trustpilot.com/review/notion.so",
    sourceType: "trustpilot",
    confidence: 0.95,
    verificationStatus: "unverified"  // Will be verified in Step 2
  }
```

---

## Summary: 5 Potential Sources Explained

When you see "Candidates discovered: 5", here's where they come from:

1. **Discovery service generates queries** based on company name, domain, industry
2. **Search provider executes queries** (Mock returns fake, Serper returns real Google results)
3. **Each result becomes a candidate** with confidence scoring
4. **Duplicates removed** (same URL counted once)
5. **Top sources kept** (highest relevance)

**Result:** 5 potential review sources ready for the Verification step

---

## Next: What Happens in Verification (Step 2)

Of the 5 discovered sources:
- Verification engine checks: Is this really a review page for our company?
- Uses: Evidence analysis, URL patterns, title/snippet matching
- Result: 2 sources verified as legitimate (highly confident)
- These 2 then get scraped with Crawl4AI

---

## Decision: Which Search Provider Do You Want?

**Options:**
1. ✅ **Keep Mock** - Perfect for testing right now
2. 🎯 **Use Serper** - Best for production (free tier + cheap paid)
3. 🆓 **Use Tavily** - Free for AI (need to implement)
4. 🔵 **Use Google Custom Search** - Limited free tier (100/day)
5. 🔍 **Use Bing** - Paid option

**My recommendation:** Start with Serper. It's already coded, has a free tier, and scales well.

Let me know which one you'd like to use, and I'll set it up for you!
