# Discovery Architecture
## Customer Experience Intelligence SaaS

**Version:** 1.0  
**Phase:** Phase 1 — Foundation  
**Date:** 2026-10-07  
**Status:** Draft

---

## Table of Contents

1. [Overview](#1-overview)
2. [Pipeline Diagram](#2-pipeline-diagram)
3. [Pipeline Stages](#3-pipeline-stages)
4. [Query Generation Strategy](#4-query-generation-strategy)
5. [Source Type Detection Rules](#5-source-type-detection-rules)
6. [Entity Resolution Algorithm](#6-entity-resolution-algorithm)
7. [Routing Decision Logic](#7-routing-decision-logic)
8. [Source Registration](#8-source-registration)
9. [Rate Limiting and Ethics](#9-rate-limiting-and-ethics)
10. [Error Handling](#10-error-handling)
11. [Discovery Run Lifecycle](#11-discovery-run-lifecycle)

---

## 1. Overview

The discovery pipeline is the mechanism by which the platform automatically finds online sources associated with a customer's business. The customer provides their company profile — name, domain, aliases, locations, social handles — and the system generates search queries, scores candidate URLs for relevance, and either auto-approves high-confidence matches or queues uncertain candidates for human review.

### 1.1 Design Goals

- **Low onboarding friction:** A new customer should see 10–20 sources discovered and ready for monitoring within 5 minutes of activating their company profile.
- **High precision:** False positives (approving a source that belongs to a different company) damage trust. The entity resolution algorithm must be conservative.
- **Transparency:** The customer can see why a source was approved or rejected (resolution signals displayed in UI).
- **Incrementality:** Re-running discovery should find new sources without re-processing known ones.

### 1.2 When Discovery Runs

| Trigger | When It Happens | Description |
|---|---|---|
| `ONBOARDING` | Company profile status changes to `ACTIVE` | First automated discovery run. Broadest query set. |
| `USER` | Customer clicks "Discover more sources" in dashboard | On-demand re-run. Uses same algorithm but skips already-known URLs. |
| `SYSTEM` | Weekly scheduled job (configurable per plan) | Periodic re-discovery to catch new listings that have appeared. |

---

## 2. Pipeline Diagram

```
COMPANY PROFILE
      │
      ▼
┌─────────────────┐
│  QUERY BUILDER  │  ← company_name, aliases, domain, social_handles, locations
└────────┬────────┘
         │ generates N search queries
         ▼
┌─────────────────────────────────────────────────────┐
│                   SEARCH EXECUTOR                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐  │
│  │ Web Search   │  │Platform APIs │  │ Known    │  │
│  │ (Google/Bing)│  │(Maps, etc.)  │  │ Patterns │  │
│  └──────────────┘  └──────────────┘  └──────────┘  │
└────────────────────────┬────────────────────────────┘
                         │ raw candidate URLs
                         ▼
               ┌─────────────────┐
               │  DEDUPLICATOR   │  ← normalize URLs, remove duplicates
               └────────┬────────┘
                        │ unique candidates
                        ▼
               ┌─────────────────┐
               │SOURCE TYPE DETECT│ ← regex patterns, domain heuristics
               └────────┬────────┘
                        │ typed candidates
                        ▼
               ┌─────────────────┐
               │ ENTITY RESOLVER │ ← score each against company profile
               └────────┬────────┘
                        │ scored candidates
                        ▼
               ┌─────────────────────────────────┐
               │        ROUTING DECISION         │
               │  Score ≥ 0.85 → AUTO-APPROVE    │
               │  0.50 ≤ Score < 0.85 → REVIEW   │
               │  Score < 0.50 → AUTO-REJECT     │
               └────────┬──────────┬─────────────┘
                        │          │
                        ▼          ▼
               ┌──────────┐  ┌──────────────┐
               │ APPROVED │  │PENDING REVIEW │
               │ SOURCES  │  │  (in-app UI) │
               └────┬─────┘  └──────┬───────┘
                    │               │ human decision
                    └───────┬───────┘
                            ▼
               ┌─────────────────────────────┐
               │    SOURCE REGISTRATION      │
               │  (Source + MonitoringTarget) │
               └─────────────────────────────┘
```

---

## 3. Pipeline Stages

### 3.1 Query Builder

**Input:** CompanyProfile entity.

**Output:** An ordered list of search query strings (typically 15–40 queries per run, depending on profile completeness).

**Responsibility:** Transform the structured company profile into text queries that are likely to surface relevant URLs across multiple platforms.

**Key design decisions:**
- Queries are generated deterministically from profile fields. No randomness. This means re-running with the same profile produces the same queries (enabling dedup of previous results).
- Each query is tagged with its "query class" (base, alias-expanded, social, news) for logging and debugging.
- Queries that target a specific platform via `site:` operator are separated from general queries, ensuring both targeted and broad coverage.

### 3.2 Search Executor

**Input:** List of search query strings.

**Output:** Raw list of `{url, title, snippet}` tuples.

**Responsibility:** Execute search queries across one or more search providers and collect result URLs.

**Search providers (Phase 1):**

| Provider | Method | Results Per Query | MVP Status |
|---|---|---|---|
| Google Custom Search API | Official API | 10 results | 🟢 MVP |
| Bing Web Search API | Official API | 10 results | 🟢 MVP (fallback) |
| Google Maps / Places API | Official API | Up to 5 results | 🟡 POST-MVP |
| Known URL pattern generation | Deterministic | 1 result per pattern | 🟢 MVP |

**Known URL pattern generation:** For well-known platforms, the system generates candidate URLs directly without searching. For example, if the company name is "Tasty Bites":

```
https://www.trustpilot.com/review/tastybites.com
https://www.trustpilot.com/review/tasty-bites
https://www.yelp.com/biz/tasty-bites-[city]
https://www.instagram.com/tastybites/
https://www.facebook.com/tastybites/
https://www.youtube.com/@tastybites
```

These generated URLs are validated via HTTP HEAD request (checking for 200 status) before being passed through the rest of the pipeline.

### 3.3 Deduplicator

**Input:** Raw candidate URLs from all search providers and pattern generators.

**Output:** Deduplicated list of unique URLs.

**URL normalization rules:**

1. Convert to lowercase.
2. Remove trailing slashes.
3. Remove query parameters that do not affect content identity (e.g. `utm_source`, `utm_medium`, `utm_campaign`, `ref`, `fbclid`, `gclid`).
4. Remove URL fragments (`#section`).
5. Normalize `www.` prefix (treat `example.com` and `www.example.com` as identical).
6. Normalize protocol (treat `http://` and `https://` as identical — store as `https://`).
7. For platform-specific URLs, normalize to canonical form:
   - Trustpilot: `https://www.trustpilot.com/review/[slug]`
   - Yelp: `https://www.yelp.com/biz/[slug]`
   - Instagram: `https://www.instagram.com/[handle]/`

**Cross-run deduplication:** Before scoring, the deduplicator checks the `sources` table for the current organization. If a URL (after normalization) already exists as a registered source, the candidate is skipped entirely — it has already been processed in a prior run.

### 3.4 Source Type Detector

**Input:** Unique candidate URLs with optional title and snippet.

**Output:** Each candidate annotated with a `detected_source_type` enum value.

**Method:** URL pattern matching against a registry of known platform patterns. Details in Section 5.

### 3.5 Entity Resolver

**Input:** Typed candidates with URL, title, and snippet.

**Output:** Each candidate annotated with `relevance_score`, `entity_resolution_score`, and `resolution_signals`.

**Method:** Multi-signal scoring algorithm. Each candidate is scored against the company profile using domain matching, name matching, location matching, social handle matching, and cross-referencing. Details in Section 6.

### 3.6 Routing Decision

**Input:** Scored candidates.

**Output:** Candidates classified as AUTO_APPROVED, PENDING_REVIEW, or AUTO_REJECTED.

**Thresholds:** Details in Section 7.

### 3.7 Source Registration

**Input:** Approved candidates (auto or human).

**Output:** New `Source` and `MonitoringTarget` records.

**Process:** Details in Section 8.

---

## 4. Query Generation Strategy

### 4.1 Base Queries (Always Generated)

These queries are always generated from `company_name` and the first location (if available).

```
Query Template                                          Purpose
────────────────────────────────────────────────────────────────────
"[company_name]" reviews                                General review discovery
"[company_name]" [city] reviews                         Geo-scoped review discovery
"[company_name]" feedback                               Alternative phrasing
"[company_name]" customer experience                    Broader coverage
site:google.com/maps "[company_name]"                   Google Maps listing
site:trustpilot.com "[company_name]"                    Trustpilot listing
site:yelp.com "[company_name]"                          Yelp listing
site:tripadvisor.com "[company_name]"                   TripAdvisor listing
```

**Example for Tasty Bites in London:**

```
"Tasty Bites" reviews
"Tasty Bites" London reviews
"Tasty Bites" feedback
"Tasty Bites" customer experience
site:google.com/maps "Tasty Bites"
site:trustpilot.com "Tasty Bites"
site:yelp.com "Tasty Bites"
site:tripadvisor.com "Tasty Bites"
```

### 4.2 Alias-Expanded Queries

For each alias in `CompanyProfile.aliases`, the base queries are duplicated with the alias substituted for `company_name`.

**Example for alias "TB Restaurants":**

```
"TB Restaurants" reviews
"TB Restaurants" London reviews
"TB Restaurants" feedback
site:google.com/maps "TB Restaurants"
site:trustpilot.com "TB Restaurants"
site:yelp.com "TB Restaurants"
```

### 4.3 Domain-Based Queries

Using `CompanyProfile.primary_domain`:

```
Query Template                                          Purpose
────────────────────────────────────────────────────────────────────
site:trustpilot.com "[primary_domain]"                  Trustpilot may index by domain
"[primary_domain]" reviews                              Domain as search term
```

### 4.4 Social Discovery Queries

Using `CompanyProfile.social_handles` and `CompanyProfile.company_name`:

```
Query Template                                          Purpose
────────────────────────────────────────────────────────────────────
"[company_name]" site:instagram.com                     Find Instagram presence
"[company_name]" site:facebook.com                      Find Facebook presence
"[company_name]" site:youtube.com                       Find YouTube presence
"@[social_handle]" site:instagram.com                   Direct handle search
"@[social_handle]" site:facebook.com                    Direct handle search
"@[social_handle]" OR "[social_handle]"                 Handle mention anywhere
```

### 4.5 News and Mention Queries (POST-MVP)

```
Query Template                                          Purpose
────────────────────────────────────────────────────────────────────
"[company_name]" news                                   News coverage
"[company_name]" [industry] [city]                      Industry-scoped news
"[company_name]" review OR complaint OR feedback        Broader mention coverage
```

### 4.6 B2B-Specific Queries (Conditional)

If the company's industry category is in a B2B sector (software, consulting, professional services), additional queries are generated:

```
Query Template                                          Purpose
────────────────────────────────────────────────────────────────────
site:g2.com "[company_name]"                            G2 software reviews
site:capterra.com "[company_name]"                      Capterra directory
site:producthunt.com "[company_name]"                   Product Hunt listing
"[company_name]" software review                        General B2B review
```

### 4.7 Multi-Location Queries

If `CompanyProfile.locations` contains more than one location, the geo-scoped queries (Section 4.1) are generated for each location (up to the first 5 locations, to avoid excessive query volume).

```
"Tasty Bites" London reviews
"Tasty Bites" Manchester reviews
"Tasty Bites" Birmingham reviews
```

### 4.8 Query Budget

To prevent excessive API usage, a query budget is enforced per run:

| Plan Tier | Max Queries Per Run | Max Runs Per Day |
|---|---|---|
| FREE | 15 | 1 |
| STARTER | 30 | 2 |
| PROFESSIONAL | 50 | 3 |
| ENTERPRISE | 100 | Unlimited |

If the generated query list exceeds the budget, queries are prioritized in this order:
1. Base queries (always kept)
2. Platform-specific `site:` queries (always kept)
3. Social discovery queries
4. Alias-expanded queries
5. News/mention queries (lowest priority, trimmed first)

---

## 5. Source Type Detection Rules

### 5.1 URL Pattern Matching Registry

Each candidate URL is matched against the following patterns, evaluated in order. The first match wins.

```
Priority  Pattern (URL contains / matches)                   Detected Source Type
────────────────────────────────────────────────────────────────────────────────
  1       google.com/maps/place/                              GOOGLE_MAPS_LISTING
  2       maps.google.com/                                    GOOGLE_MAPS_LISTING
  3       business.google.com/                                GOOGLE_BUSINESS
  4       trustpilot.com/review/                              TRUSTPILOT
  5       yelp.com/biz/                                       YELP
  6       tripadvisor.com/Restaurant_Review-                  TRIPADVISOR
  7       tripadvisor.com/Hotel_Review-                       TRIPADVISOR
  8       tripadvisor.com/Attraction_Review-                  TRIPADVISOR
  9       instagram.com/[^/]+/?$                              INSTAGRAM_PROFILE
 10       facebook.com/[^/]+/?$                               FACEBOOK_PAGE
 11       facebook.com/[^/]+/reviews                          FACEBOOK_PAGE
 12       youtube.com/@[^/]+                                  YOUTUBE_CHANNEL
 13       youtube.com/channel/                                YOUTUBE_CHANNEL
 14       youtube.com/c/                                      YOUTUBE_CHANNEL
 15       producthunt.com/products/                           PRODUCT_HUNT
 16       g2.com/products/                                    G2
 17       capterra.com/software/                              CAPTERRA
 18       capterra.com/reviews/                               CAPTERRA
 19       reddit.com/r/[^/]+/comments/                        REDDIT_THREAD
 20       linkedin.com/company/                               LINKEDIN_COMPANY
 21       twitter.com/[^/]+/?$                                TWITTER_X_MENTION
 22       x.com/[^/]+/?$                                      TWITTER_X_MENTION
 23       yellowpages.com/                                    YELLOW_PAGES
 24       yell.com/biz/                                       YELLOW_PAGES
 25       [company's primary_domain]/*                        COMPANY_WEBSITE
 26       (known news domains list)                           NEWS_ARTICLE
 27       (no match)                                          UNKNOWN_WEB
```

### 5.2 Known News Domains

A curated list of domains recognized as news publications is maintained. When a candidate URL's domain matches this list, it is typed as `NEWS_ARTICLE`. The list includes:

- Major outlets: bbc.co.uk, nytimes.com, theguardian.com, reuters.com, bloomberg.com, cnn.com, techcrunch.com, forbes.com, etc.
- Regional outlets: Added per-country as needed.
- Industry publications: Detected heuristically by domain content or manually curated.

This list is stored as configuration data, not hardcoded, to allow updates without code changes.

### 5.3 Company Website Detection

If the candidate URL's domain (after normalization) matches `CompanyProfile.primary_domain`, it is typed as `COMPANY_WEBSITE`. This takes lower priority than platform-specific patterns — for example, if the company's domain happens to be `trustpilot.com` (unlikely but defensive), Trustpilot's pattern would match first.

### 5.4 Unknown Web Handling

Candidates typed as `UNKNOWN_WEB` are still scored by entity resolution. If they score highly, they are flagged for human review. The customer can assign a source type manually if the system could not detect it.

---

## 6. Entity Resolution Algorithm

### 6.1 Purpose

Entity resolution answers the question: "Does this candidate URL actually belong to the company described in the profile, or is it a different business with a similar name?"

This is critical because many business names are common. "Tasty Bites" might refer to a restaurant in London, a food truck in Sydney, or a blog in New York. The entity resolution algorithm uses multiple signals to score confidence.

### 6.2 Signal Categories and Weights

```
Signal Category      Weight    Description
────────────────────────────────────────────────────────────────────────
Domain match         0.40      Does the candidate link to/from the company's domain?
Name match           0.30      Does the listing name match the company name or alias?
Location match       0.15      Does the listing location match the company's locations?
Social handle match  0.10      Does the listing reference known social handles?
Cross-reference      0.05      Does another verified source link to this candidate?
```

### 6.3 Signal Scoring Details

#### Domain Match (Weight: 0.40)

The most reliable signal. If a candidate page contains a link to `CompanyProfile.primary_domain`, or if the company website contains a link to the candidate URL, the match is very strong.

| Condition | Signal Score |
|---|---|
| Bidirectional link: candidate links to primary_domain AND primary_domain links to candidate | 1.0 |
| One-way outbound: candidate page links to primary_domain | 0.7 |
| One-way inbound: primary_domain links to candidate (e.g. "Find us on Yelp") | 0.8 |
| Domain appears in candidate page metadata (not as a visible link) | 0.4 |
| No domain relationship detected | 0.0 |

**Implementation note:** Checking bidirectional links requires two HTTP requests: one to the candidate URL and one to the company's homepage (or "about" page). To minimize latency, the company's homepage is crawled once per discovery run and cached. Candidate URLs are fetched individually (subject to rate limiting).

**SSRF guard:** Before fetching any candidate URL for domain match verification, the URL must pass the SSRF validation check (no internal IPs, no localhost, no private ranges). See Section 9.

#### Name Match (Weight: 0.30)

Compares the listing name (page title, business name in structured data, or search snippet title) against `company_name`, `display_name`, and `aliases`.

| Condition | Signal Score |
|---|---|
| Exact normalized match with `company_name` or `display_name` | 1.0 |
| Exact match with an alias | 0.9 |
| High similarity (Levenshtein distance, normalized > 0.80) | 0.7 |
| Partial match (normalized similarity 0.50–0.80) | 0.4 |
| Very low similarity (< 0.50) | 0.1 |
| No name found in candidate metadata | 0.0 |

**Normalization before comparison:**

1. Convert to lowercase.
2. Remove common business suffixes: Ltd, LLC, Inc, Co, Corp, Limited, PLC, GmbH, S.A.
3. Remove punctuation.
4. Collapse whitespace.
5. Remove common stop words: the, a, an, and, of.

**Example:**
- Profile: `company_name = "Tasty Bites Ltd"`
- Candidate title: `"Tasty Bites - London - Restaurant Reviews"`
- Normalized profile name: `"tasty bites"`
- Normalized candidate name: `"tasty bites london restaurant reviews"`
- Contains exact match for normalized name: score = 1.0

#### Location Match (Weight: 0.15)

Compares any location context in the candidate (address, city name in title/snippet, geo-coordinates) against `CompanyProfile.locations`.

| Condition | Signal Score |
|---|---|
| Same city as one of the company's locations | 1.0 |
| Same region/state but different city | 0.7 |
| Same country but different region | 0.5 |
| Different country | 0.1 |
| No location context detectable in candidate | 0.3 (neutral — absence of negative signal) |

**Location extraction from candidates:**
- Google Maps URLs contain location data in the URL structure.
- Yelp and TripAdvisor URLs often contain city names in the slug.
- For other URLs, the search snippet text is checked for city/country name matches.

#### Social Handle Match (Weight: 0.10)

Checks whether the candidate page references any of the company's known social handles.

| Condition | Signal Score |
|---|---|
| Candidate page contains an exact social handle from the profile (e.g. `@tastybites` on a Facebook page that links to `instagram.com/tastybites`) | 1.0 |
| Candidate page mentions the handle in text but not as a link | 0.7 |
| No social handle reference found | 0.0 |

#### Cross-Reference (Weight: 0.05)

Checks whether any already-verified source for this organization links to the candidate URL.

| Condition | Signal Score |
|---|---|
| An existing verified source's page links to this candidate URL | 1.0 |
| No cross-reference found | 0.0 |

**Implementation note:** Cross-referencing requires the company to already have at least one verified source. On the first discovery run (onboarding), this signal will always be 0.0. It becomes useful on subsequent re-discovery runs.

### 6.4 Combined Score Calculation

```
combined_score = (domain_match  * 0.40)
              + (name_match    * 0.30)
              + (location_match * 0.15)
              + (social_match  * 0.10)
              + (cross_ref     * 0.05)
```

**Score range:** 0.0 to 1.0.

**Example calculation:**

```
Candidate: https://www.trustpilot.com/review/tastybites.com

  Domain match:   1.0 (Trustpilot URL slug IS the domain)  * 0.40 = 0.40
  Name match:     1.0 (listing name "Tasty Bites" exact)    * 0.30 = 0.30
  Location match: 1.0 (London matches profile location)     * 0.15 = 0.15
  Social match:   0.0 (no social handles on Trustpilot)     * 0.10 = 0.00
  Cross-ref:      0.0 (first run, no existing sources)      * 0.05 = 0.00
                                                        ──────────────────
  Combined score: 0.85 → AUTO_APPROVED
```

### 6.5 Storing Resolution Signals

The full signal breakdown is stored on the `DiscoveryCandidate` record in the `resolution_signals` JSONB field:

```json
{
  "domain_match": {
    "score": 1.0,
    "evidence": "Trustpilot slug matches primary_domain 'tastybites.com'"
  },
  "name_match": {
    "score": 1.0,
    "evidence": "Exact normalized match: 'tasty bites' == 'tasty bites'"
  },
  "location_match": {
    "score": 1.0,
    "evidence": "City 'London' found in listing, matches profile location"
  },
  "social_handle_match": {
    "score": 0.0,
    "evidence": "No social handles found on candidate page"
  },
  "cross_reference": {
    "score": 0.0,
    "evidence": "No existing verified sources link to this candidate"
  }
}
```

This transparency allows:
- Engineers to debug false positives/negatives.
- Customers to understand why a source was or was not approved in the review UI.

---

## 7. Routing Decision Logic

### 7.1 Threshold Configuration

```
Score Range              Decision           ReviewStatus
────────────────────────────────────────────────────────
score >= 0.85            AUTO_APPROVED      AUTO_APPROVED
0.50 <= score < 0.85     PENDING_REVIEW     PENDING_REVIEW
score < 0.50             AUTO_REJECTED      AUTO_REJECTED
```

### 7.2 Auto-Approve Path (Score >= 0.85)

- The candidate is automatically promoted to a `Source` record.
- A `MonitoringTarget` is created for the source with the default check interval for the detected source type.
- The `DiscoveryCandidate.promoted_to_source_id` is set to the new source's ID.
- **No notification is sent** for auto-approved sources during onboarding (to avoid flooding the customer). On subsequent discovery runs, an alert is generated: "New source automatically discovered: [title]".

### 7.3 Pending Review Path (0.50 <= Score < 0.85)

- The candidate is stored with `review_status = PENDING_REVIEW`.
- It appears in the customer's dashboard under "Review Discovered Sources."
- The UI displays:
  - The candidate URL and detected source type.
  - A preview/snippet of the page content.
  - The confidence score and individual signal scores with explanations.
  - "Approve" and "Reject" buttons.
- If the customer approves: `review_status = HUMAN_APPROVED`, and the candidate is promoted to a Source (same as auto-approve path).
- If the customer rejects: `review_status = HUMAN_REJECTED`, and the candidate is not promoted. An optional `rejection_reason` is stored.

### 7.4 Auto-Reject Path (Score < 0.50)

- The candidate is stored with `review_status = AUTO_REJECTED`.
- It does NOT appear in the review UI by default.
- The customer can optionally view rejected candidates via a "Show rejected" toggle in the UI (useful for debugging or catching false negatives).
- If the customer manually approves a rejected candidate, its `review_status` changes to `HUMAN_APPROVED` and it is promoted normally.

### 7.5 Threshold Tuning

The thresholds (0.85 and 0.50) are configurable at the application level. They are not hardcoded in database logic.

Initial thresholds are conservative (high auto-approve bar). As the system accumulates data on false positive/negative rates, thresholds can be adjusted. A feedback loop is planned for post-MVP:

```
Customer rejects auto-approved source → logged as false positive
Customer approves auto-rejected source → logged as false negative

False positive rate > 5% → raise auto-approve threshold (+0.02)
False negative rate > 15% → lower auto-reject threshold (-0.02)
```

---

## 8. Source Registration

### 8.1 Promotion Process

When a candidate is approved (auto or human), the following occurs in a single database transaction:

1. **Create Source record:**
   - `organization_id` from the candidate's organization.
   - `company_profile_id` from the discovery run's profile.
   - `source_type` from `detected_source_type`.
   - `url` from the candidate's normalized URL.
   - `ownership_type` determined by source type (COMPANY_WEBSITE = OWNED; TRUSTPILOT, YELP, etc. = THIRD_PARTY; social platforms = OWNED if handle matches profile, else THIRD_PARTY).
   - `verification_status` = `AUTO_VERIFIED` or `HUMAN_VERIFIED`.
   - `confidence_score` from the candidate's combined score.
   - `entity_resolution_signals` copied from the candidate's `resolution_signals`.
   - `platform_identifier` extracted if available (e.g. Google Place ID from URL).
   - `title` auto-generated: "[CompanyProfile.display_name] — [SourceType human label]".
   - `discovered_via` = `'DISCOVERY_RUN'`.

2. **Create MonitoringTarget record:**
   - `source_id` = new source's ID.
   - `organization_id` = same.
   - `status` = `ACTIVE`.
   - `check_interval_minutes` = default for the source type (see monitoring-architecture.md).
   - `next_check_at` = `NOW()` (triggers first ingestion immediately).

3. **Update DiscoveryCandidate:**
   - `promoted_to_source_id` = new source's ID.
   - `reviewed_at` = `NOW()`.
   - `review_status` = `AUTO_APPROVED` or `HUMAN_APPROVED`.

4. **Update DiscoveryRun counters:**
   - Increment `candidates_verified`.

### 8.2 Duplicate URL Prevention

The `UNIQUE(organization_id, url)` constraint on the `sources` table prevents the same URL from being registered twice. If promotion is attempted and the URL already exists:

- The candidate is linked to the existing source (`promoted_to_source_id` = existing source ID).
- No new source or monitoring target is created.
- The candidate's `review_status` is set to `AUTO_APPROVED` with a note in `resolution_signals`: `"already_registered": true`.

---

## 9. Rate Limiting and Ethics

### 9.1 Search API Rate Limits

| Provider | Rate Limit | Daily Quota (Per Provider Account) |
|---|---|---|
| Google Custom Search API | 1 request per second | 10,000 queries per day |
| Bing Web Search API | 10 requests per second | 1,000 queries per day (free tier); 30,000 (paid) |

**Per-organization limits:**

| Plan Tier | Max Searches Per Day | Max Discovery Runs Per Day |
|---|---|---|
| FREE | 15 | 1 |
| STARTER | 60 | 2 |
| PROFESSIONAL | 150 | 3 |
| ENTERPRISE | 500 | Unlimited |

### 9.2 Candidate URL Fetching Limits

When the entity resolver fetches candidate URLs to check for domain links and name matches:

- Maximum 1 request per 10 seconds per target domain.
- Maximum 50 candidate URL fetches per discovery run.
- HTTP HEAD request used first (cheaper). Full GET only if HEAD returns 200 and content analysis is needed.
- Timeout: 10 seconds per request.
- User-Agent: Clearly identifies the service (e.g. `CXIntelligenceBot/1.0 (+https://cxintel.app/bot)`).

### 9.3 Robots.txt Compliance

Before fetching any candidate URL for verification, the system checks the target domain's `robots.txt`:

1. Fetch `https://[domain]/robots.txt`.
2. Parse for `User-agent: *` and `User-agent: CXIntelligenceBot` directives.
3. If the candidate URL path is disallowed, skip the fetch. The candidate is still scored using available signals (search snippet, URL pattern), but the domain match signal defaults to 0.0.
4. `robots.txt` results are cached per domain for 24 hours.

### 9.4 SSRF Protection

Before any HTTP request to a candidate URL or company website, the URL is validated:

**Blocked targets:**
- Private IPv4 ranges: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`
- Loopback: `127.0.0.0/8`
- Link-local: `169.254.0.0/16`
- IPv6 private/loopback ranges
- `localhost`, `0.0.0.0`
- Cloud metadata endpoints: `169.254.169.254`, `metadata.google.internal`
- Internal service hostnames

**Validation process:**
1. Parse the URL.
2. Resolve the hostname to IP address(es).
3. Check each resolved IP against the blocklist.
4. If any IP is blocked, reject the URL with a logged error.
5. DNS rebinding defense: re-validate the IP at connection time (not just at DNS resolution time).

### 9.5 Ethical Constraints

- No CAPTCHA bypass. If a candidate URL returns a CAPTCHA challenge, the fetch is abandoned.
- No authentication bypass. No login, no cookie injection, no session reuse.
- No form submission. The platform only reads publicly accessible content.
- No scraping of private/authenticated content. Only content visible to an unauthenticated browser session.
- Respect `Crawl-delay` directives in `robots.txt` (if present, use the delay instead of the default rate limit).

---

## 10. Error Handling

### 10.1 Search API Errors

| Error | Action |
|---|---|
| Search API rate limited (429) | Pause discovery run; retry after cooldown period. Mark run as `RUNNING` (not failed). |
| Search API quota exhausted | Stop run. Mark as `COMPLETED` with reduced results. Log warning. |
| Search API unavailable (5xx) | Retry up to 3 times with exponential backoff. If all retries fail, fall back to alternate provider. If both fail, mark run as `FAILED`. |
| Zero results for a query | Log the query and move to next. Not an error — the company may not have presence on that platform. |

### 10.2 Candidate Fetch Errors

| Error | Action |
|---|---|
| Candidate URL returns 404 | Skip candidate. Do not score. Source does not exist. |
| Candidate URL returns 403 | Skip domain match signal. Score using other signals (name, location from snippet). |
| Candidate URL times out | Skip domain match signal. Score using other signals. |
| Candidate URL returns CAPTCHA | Skip domain match signal. Score using other signals. Log for monitoring (may indicate rate limiting). |
| DNS resolution fails | Skip candidate entirely. URL is likely invalid. |
| SSRF validation fails | Skip candidate. Log the blocked URL for security team review. |

### 10.3 Overall Run Failure

A discovery run is marked `FAILED` only if:
- The search API is completely unavailable (all retries exhausted, all providers down).
- An unrecoverable system error occurs (database write failure, etc.).

A run is marked `COMPLETED` even if some individual queries returned errors, as long as at least some results were processed.

---

## 11. Discovery Run Lifecycle

### 11.1 End-to-End Flow

```
1. Trigger received (ONBOARDING | USER | SYSTEM)
2. Create DiscoveryRun record (status: PENDING)
3. Load CompanyProfile
4. Validate profile completeness (warn if low)
5. Set status: RUNNING, set started_at
6. Query Builder generates queries (respecting budget)
7. For each query:
   a. Execute via Search Executor
   b. Collect results
   c. Respect rate limits (wait between queries if needed)
8. Deduplicate all collected URLs
9. Filter out already-known URLs (cross-check sources table)
10. For each unique candidate:
    a. Detect source type
    b. Score via Entity Resolver (may fetch candidate URL)
    c. Apply routing decision
    d. Store DiscoveryCandidate record
11. For AUTO_APPROVED candidates:
    a. Create Source + MonitoringTarget (in transaction)
12. Update DiscoveryRun counters
13. Set status: COMPLETED, set completed_at
14. If new sources were found, enqueue immediate ingestion jobs
```

### 11.2 Timing Expectations

| Step | Expected Duration |
|---|---|
| Query generation | < 1 second |
| Search execution (30 queries) | 30–90 seconds (rate limited) |
| URL deduplication + filtering | < 1 second |
| Entity resolution (50 candidates) | 60–300 seconds (depends on URL fetches) |
| Source registration | < 1 second per source |
| **Total run time** | **2–7 minutes** |

### 11.3 Concurrency

Only one discovery run per organization is allowed to be in `RUNNING` state at any time. If a user triggers a run while one is already running, the request is rejected with a message: "A discovery run is already in progress."

System-triggered runs check for this constraint before starting and silently skip if a run is already active.
