# Pipeline Fix Summary & Testing Guide

**Date**: October 19, 2026  
**Status**: ✅ READY FOR TESTING

## What Was Fixed

### 1. ✅ Search Provider Fixed
**Changed from**: `"omniroute-serper-combo"` (doesn't exist)  
**Changed to**: `"multi-account-serper"` (uses your 2 Serper API keys)

**File**: `src/components/dashboard/pipeline-trigger-button.tsx`

### 2. ✅ Date.now() Prerendering Error Fixed
**Problem**: Next.js tried to prerender dashboard with `Date.now()` in pipeline code  
**Solution**: Added `noStore()` to opt out of caching for dashboard page

**File**: `src/app/(app)/dashboard/page.tsx`

### 3. ✅ Discovery Limit Increased
**Changed from**: 3 sources  
**Changed to**: 15 sources

**File**: `src/components/dashboard/pipeline-trigger-button.tsx`

### 4. ✅ Stripe Build Error Fixed
**Problem**: Build failed without `STRIPE_SECRET_KEY`  
**Solution**: Made Stripe initialization optional

**File**: `src/lib/billing/stripe.ts`

## Current Configuration

### Environment Variables (.env.local)
```bash
# Serper Search API (2 keys for load balancing)
SERPER_API_KEYS=3b1b98430ba581be7e49d24ae8fb2f03e969c60e,f8f840e1fb0e91a00e6d73dcaabe06b13918b2e1

# Database (Supabase)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Optional: Stripe (Phase 13)
# STRIPE_SECRET_KEY=sk_test_...
```

### Search Provider Configuration
```typescript
// pipeline-trigger-button.tsx
{
  searchProviderType: "multi-account-serper",  // ✅ Uses 2 Serper keys
  scrapingProviderType: "crawl4ai",
  sourceLimit: 15,                              // ✅ Discover 15 sources
}
```

## Manual Testing Steps

### Step 1: Start Dev Server
```bash
# Make sure no other dev server is running
# Then start a fresh one:
npm run dev
```

**Expected output**:
```
▲ Next.js 16.4.0
- Local:    http://localhost:3000
✓ Ready in 2s
```

**No errors should appear** ✅

### Step 2: Open Dashboard
1. Navigate to: `http://localhost:3000/dashboard`
2. You should see the dashboard load successfully
3. **No "Date.now()" errors** should appear in the terminal

### Step 3: Run Discovery Pipeline
1. On the dashboard, find the **"Run Discovery & Ingestion Pipeline"** button
2. Click it
3. Wait 30-60 seconds

**Expected Success Message**:
```
Pipeline complete: Discovered 10+, Verified 8+, Ingested X, Analyzed X reviews
```

### Step 4: Verify Serper API Calls
1. Go to: https://serper.dev/dashboard
2. Check the "API Calls" or "Usage" section
3. You should see **recent search requests** with queries like:
   - "Tata Motors reviews"
   - "Tata Motors customer feedback"
   - "Tata Motors complaints"

### Step 5: Check Results in Database
1. Go to: `http://localhost:3000/dashboard/sources`
2. You should see **10-15 new sources** registered
3. Each source should have:
   - ✅ URL (Trustpilot, G2, Reddit, etc.)
   - ✅ Verification status (verified_auto or unverified)
   - ✅ Confidence score (0.5-1.0)

### Step 6: Check Monitoring Targets
1. Go to: `http://localhost:3000/dashboard/monitoring`
2. You should see monitoring targets created for verified sources
3. Each target should show:
   - ✅ Status: active
   - ✅ Polling interval: Every X hours
   - ✅ Next check time

## What Should Happen

### Discovery Flow
```
Button Click
  ↓
Multi-Account Serper Provider
  ├─ Load balances between 2 API keys
  ├─ Searches Google for "Tata Motors reviews"
  └─ Returns 15 candidate URLs
  ↓
Verification Engine
  ├─ Checks company name match
  ├─ Verifies domain/location
  └─ Filters out false positives
  ↓
Source Registry
  ├─ Registers 10+ verified sources
  └─ Creates monitoring targets
```

### Expected Results
- **Candidates Discovered**: 15
- **Sources Verified**: 10-12 (some filtered out)
- **Sources Registered**: 10-12
- **Monitoring Targets**: 10-12

## Troubleshooting

### Problem: "No sources discovered"
**Check**:
1. Serper API keys are valid (check Serper dashboard)
2. Company profile exists (check `/onboarding`)
3. Company name is correct ("Tata Motors" not "Notion")
4. Internet connection is working

**Solution**: Verify `.env.local` has `SERPER_API_KEYS` set

### Problem: "OMNIROUTE_SERPER_COMBO not configured"
**This error should NOT appear anymore** ✅

If it does, check:
1. `pipeline-trigger-button.tsx` uses `"multi-account-serper"`
2. Dev server was restarted after the fix
3. Clear Next.js cache: `rm -rf .next`

### Problem: "Date.now() prerendering error"
**This error should NOT appear anymore** ✅

If it does, check:
1. `dashboard/page.tsx` has `noStore()` at the top
2. Dev server was restarted
3. Clear Next.js cache: `rm -rf .next`

### Problem: "Only 3-4 sources discovered"
**This should NOT happen anymore** ✅

If it does, check:
1. `sourceLimit: 15` in pipeline-trigger-button.tsx
2. Serper account has enough credits
3. Company profile has good data (domain, locations)

## Success Criteria ✅

- [x] Build completes without errors
- [ ] Dev server starts without Date.now() errors
- [ ] Dashboard loads successfully
- [ ] Pipeline button triggers search
- [ ] Serper dashboard shows API calls
- [ ] 10+ sources discovered
- [ ] Sources match company (Tata Motors)
- [ ] Monitoring targets created

## Files Modified

```
✅ src/components/dashboard/pipeline-trigger-button.tsx
   - Changed to "multi-account-serper"
   - Increased sourceLimit to 15
   - Removed aiProviderType (not needed)

✅ src/app/(app)/dashboard/page.tsx
   - Added noStore() to prevent prerendering
   - Fixes Date.now() error

✅ src/lib/billing/stripe.ts
   - Made Stripe optional (build succeeds without key)
   - Added requireStripe() guard function

✅ docs/PIPELINE_FIX_TESTING_GUIDE.md
   - This testing guide
```

## Next Steps After Testing

1. **If all tests pass**:
   - Mark Phase 12 as complete
   - Continue with Phase 13 (Stripe billing)
   - Add Stripe environment variables when ready

2. **If issues persist**:
   - Check the troubleshooting section above
   - Review Serper dashboard for API errors
   - Verify company profile data is complete
   - Check browser console for client-side errors

## Quick Verification Commands

```bash
# Check if dev server is running
curl http://localhost:3000/api/health

# Check environment variables are loaded
npm run dev | grep "Environments: .env.local"

# Check Serper keys are configured
grep SERPER_API_KEYS .env.local

# Check company profile in database
# (Use Supabase dashboard or SQL client)
```

## Support

If you encounter issues:
1. Check all files were saved after edits
2. Restart the dev server completely
3. Clear Next.js cache: `rm -rf .next`
4. Check browser console and terminal for errors
5. Verify Serper dashboard shows recent API calls

---

**Status**: All fixes applied ✅  
**Ready for**: Manual testing  
**Expected time**: 5-10 minutes to verify
