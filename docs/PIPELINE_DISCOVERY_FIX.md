# Pipeline Discovery Fix - October 19, 2026

## Issues Identified

1. **Mock Provider Instead of Real Search**: The pipeline trigger button was using `searchProviderType: "mock"` instead of the real Serper provider
2. **Low Source Limit**: The `sourceLimit` was set to only `3`, causing only 4 discoveries
3. **Missing Company Profile ID**: The pipeline wasn't receiving a `companyProfileId`, so it couldn't determine what company to search for
4. **Search Provider Not Triggering**: Without the company profile, the discovery service couldn't construct proper search queries

## Root Cause

The `pipeline-trigger-button.tsx` component was:
- Hardcoded to use the `mock` search provider
- Not fetching the active company profile before running the pipeline
- Using a very low `sourceLimit` of 3

This meant:
1. No real web searches were executed (mock provider just returns empty results)
2. Even if searches ran, only 3 sources would be discovered
3. Without a company profile, the pipeline couldn't build search queries like "Tata Motors reviews" or "Tata Motors customer feedback"

## Solutions Implemented

### 1. Use Real OmniRoute-Serper Provider
**File**: `src/components/dashboard/pipeline-trigger-button.tsx`

Changed from:
```typescript
searchProviderType: "mock"
```

To:
```typescript
searchProviderType: "omniroute-serper-combo"
```

This routes searches through OmniRoute's Serper integration, which automatically load-balances across multiple Serper API accounts.

### 2. Increase Discovery Limit
**File**: `src/components/dashboard/pipeline-trigger-button.tsx`

Changed from:
```typescript
sourceLimit: 3
```

To:
```typescript
sourceLimit: 15 // Increased to get at least 10 discoveries after verification
```

This ensures we discover 15 candidate sources, which after verification should yield at least 10 valid sources.

### 3. Fetch and Pass Company Profile ID
**File**: `src/components/dashboard/pipeline-trigger-button.tsx`

Added:
```typescript
import { getCompanyProfile } from "@/lib/actions/company-profile";

// Inside handleRunPipeline:
const companyData = await getCompanyProfile();

if (!companyData?.profile?.id) {
  throw new Error("No company profile found. Please complete onboarding first.");
}

// Pass to API:
companyProfileId: companyData.profile.id
```

This ensures the pipeline knows which company to search for.

## How the Pipeline Now Works

1. **User clicks "Run Discovery & Ingestion Pipeline"**
2. **Fetch Active Company Profile**: Gets the user's organization's company profile (e.g., "Tata Motors")
3. **Build Search Queries**: Uses company name, domain, aliases, and locations to construct targeted queries:
   - "Tata Motors reviews"
   - "Tata Motors customer feedback"
   - "Tata Motors complaints"
4. **Execute Real Web Search**: OmniRoute routes the search to Serper (Google Search API)
5. **Discover 15 Candidates**: Finds up to 15 potential review sources
6. **Verify Candidates**: Uses multi-factor verification to ensure sources actually relate to the company
7. **Register Verified Sources**: Adds verified sources to the source registry
8. **Create Monitoring Targets**: Sets up automated polling for each verified source

## Expected Results

After this fix, when you run the discovery pipeline:
- ✅ At least **10-15 sources discovered** (instead of 4)
- ✅ **Real web searches trigger** in Serper dashboard
- ✅ Sources match the **correct company** (Tata Motors, not Notion)
- ✅ Verified sources registered in the database
- ✅ Monitoring targets created for automated ingestion

## Environment Variables Required

Ensure these are set in `.env.local`:

```bash
# OmniRoute Configuration
OMNIROUTE_API_KEY=sk-9e517fdd6fa51123-729b76-8f2990dd
OMNIROUTE_BASE_URL=http://localhost:20128

# Serper API Keys (comma-separated for load balancing)
SERPER_API_KEYS=3b1b98430ba581be7e49d24ae8fb2f03e969c60e,f8f840e1fb0e91a00e6d73dcaabe06b13918b2e1
```

## Testing Checklist

- [ ] Run discovery pipeline from dashboard
- [ ] Verify Serper dashboard shows search requests
- [ ] Check that 10+ sources are discovered
- [ ] Verify sources match the active company profile
- [ ] Confirm monitoring targets are created
- [ ] Check that verification status is "verified_auto" or "unverified" (not "rejected")

## Architecture Flow

```
User Action
  ↓
Pipeline Trigger Button
  ↓
Fetch Company Profile (Supabase)
  ↓
POST /api/pipeline/run
  ↓
Pipeline Orchestrator
  ↓
Discovery Service
  ↓
OmniRoute Serper Provider
  ↓
OmniRoute Gateway (localhost:20128)
  ↓
Serper API (Google Search)
  ↓
15 Candidate Sources
  ↓
Source Verification Engine
  ↓
10+ Verified Sources
  ↓
Source Registry (Supabase)
  ↓
Monitoring Targets Created
```

## Related Files

- `src/components/dashboard/pipeline-trigger-button.tsx` - Trigger component (FIXED)
- `src/app/api/pipeline/run/route.ts` - Pipeline API endpoint
- `src/lib/pipeline/pipeline-orchestrator.ts` - Main orchestration logic
- `src/lib/discovery/service.ts` - Discovery service
- `src/lib/discovery/providers/omniroute-serper.ts` - OmniRoute Serper provider
- `src/lib/discovery/utils.ts` - Candidate evaluation logic

## Next Steps

1. **Test the Fix**: Run the pipeline and verify you get 10+ discoveries
2. **Monitor Serper Usage**: Check the Serper dashboard to confirm searches are executing
3. **Review Discovered Sources**: Ensure they match your company (Tata Motors)
4. **Adjust Source Limit**: If needed, increase `sourceLimit` to 20-25 for more discoveries

## Notes

- The OmniRoute-Serper integration automatically load-balances across multiple Serper API keys
- Each Serper search consumes 1 credit from your Serper quota
- The verification engine filters out false positives using company name, domain, location, and confidence scoring
- Sources with confidence < 0.30 are automatically rejected
- Sources with confidence >= 0.85 (or >= 0.65 for community sources) are auto-verified
