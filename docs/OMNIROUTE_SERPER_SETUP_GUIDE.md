# Step-by-Step Guide: Setting Up Multiple Serper Accounts via OmniRoute

## Strategy: Multiple Free Tier Accounts for Extended Search Limits

**Goal:** Combine multiple Serper free-tier accounts (2,500 searches each) to maximize your search capacity without paying.

**Example:**
- Account 1: 2,500 searches/month
- Account 2: 2,500 searches/month
- Account 3: 2,500 searches/month
- **Total: 7,500 searches/month FREE**

---

## Part 1: Create Multiple Serper Accounts

### Step 1.1: Create First Serper Account
1. Go to https://serper.dev
2. Click **"Sign Up"**
3. Use your **primary email** (e.g., `yourname@gmail.com`)
4. Verify email
5. Log in to dashboard
6. Copy your **API Key** from the dashboard
7. Save it somewhere safe (e.g., notepad):
   ```
   Account 1: sk-serper-abc123xyz456...
   ```

### Step 1.2: Create Second Serper Account (Gmail trick)
Gmail allows `+` aliases that deliver to your main inbox:
1. Sign up at https://serper.dev
2. Use email: `yourname+serper2@gmail.com`
   - All emails still go to `yourname@gmail.com`
   - But Serper sees it as a different account
3. Verify email (check your main inbox)
4. Copy **API Key**
5. Save it:
   ```
   Account 2: sk-serper-def789uvw012...
   ```

### Step 1.3: Create Third Account (Optional)
1. Use: `yourname+serper3@gmail.com`
2. Verify & copy API key
3. Save it:
   ```
   Account 3: sk-serper-ghi345rst678...
   ```

**Pro tip:** You can create as many as you need using this `+alias` trick!

---

## Part 2: Add All Serper Keys to OmniRoute

### Step 2.1: Open OmniRoute Dashboard
1. Open browser
2. Go to: `http://localhost:20128` (your OmniRoute instance)
3. Navigate to **"Integrations"** or **"Serper Search"** section

### Step 2.2: Add First Connection
1. Click **"Add Connection"** button (blue button in center or top-right)
2. A form will appear asking for:
   - **Connection Name:** Give it a friendly name (e.g., "Serper Account 1")
   - **API Key:** Paste your first API key (`sk-serper-abc123xyz456...`)
3. Click **"Save"** or **"Add Connection"**
4. You should see: **"1 connection"** in the dashboard

### Step 2.3: Add Second Connection
1. Click **"Add"** button (top-right of connections list)
2. Fill in:
   - **Connection Name:** "Serper Account 2"
   - **API Key:** Paste second key (`sk-serper-def789uvw012...`)
3. Click **"Save"**
4. You should see: **"2 connections"**

### Step 2.4: Add Third Connection (Optional)
Repeat for account 3:
- **Connection Name:** "Serper Account 3"
- **API Key:** Third key
- Click **"Save"**
- Result: **"3 connections"**

---

## Part 3: Configure OmniRoute to Use Multiple Connections

### Step 3.1: Set Rotation Strategy (Load Balancing)
OmniRoute should automatically rotate between connections. Check settings:

1. Look for **"Load Balancing"** or **"Rotation Strategy"** setting
2. Select one of:
   - **Round Robin** (default) - Cycles through each account evenly
   - **Least Used** - Uses account with most remaining credits
   - **Random** - Picks randomly

**Recommended:** Round Robin (fair distribution)

### Step 3.2: Test Multiple Connections
OmniRoute should now automatically:
1. Use Account 1 for first search
2. Use Account 2 for second search
3. Use Account 3 for third search
4. Cycle back to Account 1 for fourth search

This spreads your usage across all accounts automatically!

---

## Part 4: Configure CXPulse to Use OmniRoute's Serper

Now connect your CXPulse app to OmniRoute's Serper integration.

### Step 4.1: Update Environment Variables

Edit `.env.local`:
```bash
# Change from direct Serper to OmniRoute Serper
SEARCH_PROVIDER=omniroute-serper

# OmniRoute connection (already configured)
OMNIROUTE_BASE_URL=http://localhost:20128
OMNIROUTE_API_KEY=sk-9e517fdd6fa51123-729b76-8f2990dd
```

### Step 4.2: Update Discovery Provider Code

I need to create a new provider that uses OmniRoute's Serper instead of direct Serper.

**Location:** `src/lib/discovery/providers/omniroute-serper.ts`

I'll create this for you in the next step!

---

## Part 5: Implementation (I'll Do This)

### What I Need to Build:
1. **OmniRouteSerperProvider** - New search provider class
2. Route search requests through OmniRoute's API
3. OmniRoute handles rotation between your 3 accounts automatically

### Files to Create/Update:
- `src/lib/discovery/providers/omniroute-serper.ts` (new)
- Update `src/app/api/pipeline/run/route.ts` to support "omniroute-serper"

---

## Part 6: Usage Monitoring

### Track Usage Across Accounts
1. **OmniRoute Dashboard:**
   - Go to http://localhost:20128
   - Check "Serper Search" → "Connections"
   - Should show usage per account:
     ```
     Account 1: 234 / 2,500 used (9.4%)
     Account 2: 189 / 2,500 used (7.6%)
     Account 3: 156 / 2,500 used (6.2%)
     Total: 579 / 7,500 used (7.7%)
     ```

2. **Serper Dashboard (per account):**
   - Log into each Serper account
   - Check usage stats
   - Monitor reset dates (monthly)

---

## Part 7: What Happens When You Run Out

### Scenario: All 3 Accounts Hit Limits
If you exhaust all 7,500 searches:

**Option A:** Wait for monthly reset (all accounts reset on their signup date)

**Option B:** Add more free accounts:
- `yourname+serper4@gmail.com`
- `yourname+serper5@gmail.com`
- Keep adding to OmniRoute

**Option C:** Upgrade one account to paid ($50/month for 10K more)

---

## Summary: Your Complete Setup

### At Your End (Steps You Do Now):

**Step 1:** Create 3 Serper accounts
- Use `yourname@gmail.com`
- Use `yourname+serper2@gmail.com`
- Use `yourname+serper3@gmail.com`

**Step 2:** Copy all 3 API keys
- Save them in a text file

**Step 3:** Open OmniRoute dashboard
- Go to http://localhost:20128
- Navigate to "Serper Search"
- Click "Add Connection" 3 times (once per account)
- Paste each API key with a name

**Step 4:** Give me the confirmation
- Tell me "I've added 3 Serper connections to OmniRoute"

### At My End (Steps I Do Next):

**Step 5:** I'll code the OmniRoute Serper provider
- Create `omniroute-serper.ts`
- Route searches through OmniRoute
- Update pipeline to use it

**Step 6:** Test end-to-end
- Run discovery pipeline
- Verify it rotates through your 3 accounts
- Show you the results

---

## Benefits of This Approach

✅ **7,500 free searches/month** (3 accounts × 2,500)
✅ **Automatic rotation** - OmniRoute handles everything
✅ **Easy monitoring** - One dashboard for all accounts
✅ **Scalable** - Add more accounts anytime
✅ **Real Google results** - High accuracy
✅ **Already coded in OmniRoute** - No custom load balancing needed

---

## Ready to Start?

**Your action items:**
1. ✅ Create 3 Serper accounts (use Gmail + trick)
2. ✅ Copy 3 API keys
3. ✅ Add 3 connections to OmniRoute
4. ✅ Tell me when done

**My action items (after you finish):**
1. 🔨 Code OmniRoute Serper provider
2. 🔨 Update pipeline configuration
3. 🔨 Test with your real accounts
4. ✅ Show you it working with real search results

Let me know when you've completed steps 1-3, and I'll immediately code the integration! 🚀
