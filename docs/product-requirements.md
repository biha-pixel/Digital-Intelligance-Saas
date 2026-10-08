# Product Requirements Document
## Customer Experience Intelligence SaaS

**Version:** 1.0  
**Phase:** Phase 1 — Foundation  
**Date:** 2026-10-07  
**Status:** Draft

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Company Identity Profile Requirements](#2-company-identity-profile-requirements)
3. [Source Type Taxonomy](#3-source-type-taxonomy)
4. [Feedback Model Definition](#4-feedback-model-definition)
5. [Customer Intelligence Approach](#5-customer-intelligence-approach-privacy-first)
6. [Monitoring Requirements](#6-monitoring-requirements)
7. [Non-Functional Requirements](#7-non-functional-requirements)

---

## 1. Product Overview

### 1.1 What We Are Building

Customer Experience Intelligence SaaS is a platform that gives businesses a unified, continuously updated picture of how their brand appears across the internet. It aggregates customer feedback, reviews, social media mentions, news coverage, and directory listings into a single dashboard — with AI-powered sentiment analysis and trend detection applied automatically.

### 1.2 Core Value Proposition

Most businesses know they have reviews on Google, Yelp, and Trustpilot — but they check them manually, inconsistently, and in isolation. They miss patterns. They miss early warning signs. They have no idea how their brand appears in places they've never thought to look.

This platform solves that by:

- **Automated discovery:** The customer provides their company name and domain. The platform finds their online presence automatically — no manual URL entry required.
- **Continuous monitoring:** Once sources are registered, the platform polls them on a schedule and surfaces new content.
- **AI analysis:** Every piece of feedback is classified by sentiment, intent, and topic using OmniRoute-routed AI models.
- **Insight aggregation:** Individual items are rolled up into trends, anomalies, and actionable alerts.

### 1.3 Key Differentiator: Automated Discovery

Competitors require users to manually connect accounts or paste URLs. This platform generates search queries from the company profile, discovers candidate sources automatically, scores them for relevance via entity resolution, and routes high-confidence matches directly to monitoring — with a human review queue for uncertain cases.

This dramatically reduces onboarding friction. A new customer can have 10–20 sources being monitored within minutes of creating their profile.

### 1.4 Target Customers

| Segment | Description | Primary Use Case |
|---|---|---|
| SMB (Small-Medium Business) | Local or regional businesses, 10–500 employees | Reputation monitoring, review management |
| Mid-Market | Regional or national brands, 500–5000 employees | Multi-location monitoring, competitive benchmarking |
| Enterprise | Large brands, multinational | CRM integration, competitive intelligence, custom reports |

### 1.5 MVP Scope Boundaries

**In scope for MVP:**
- Single company profile per organization
- Automated discovery from web search + known platform URL patterns
- Core source types: Google Business, Trustpilot, Yelp, TripAdvisor, company website, Facebook Page, Instagram, YouTube
- Feedback ingestion and normalization
- AI sentiment and topic analysis via OmniRoute
- Weekly summary reports
- Email alerts for critical events

**Out of scope for MVP:**
- Multi-brand / multi-profile per organization
- Connected accounts (OAuth integrations)
- CRM data import
- White-label / reseller mode
- Mobile app

---

## 2. Company Identity Profile Requirements

The Company Identity Profile is the foundation upon which automated discovery and monitoring are built. Every field serves a purpose: either to generate search queries, resolve entity matches, or contextualize analysis.

### 2.1 Field Definitions

| Field | Type | MVP Status | Purpose |
|---|---|---|---|
| `company_name` | string | 🟢 MVP | Legal registered name. Used as the primary search query anchor. |
| `display_name` | string (nullable) | 🟢 MVP | Trading name if different from legal name (e.g. "Tasty Bites" vs "TB Holdings Ltd"). Used in search queries. |
| `primary_domain` | string | 🟢 MVP | The company's main website domain (e.g. `tastybites.com`). Used for entity resolution — a listing that links to this domain gets a strong relevance signal. |
| `country` | string (ISO 3166-1 alpha-2) | 🟢 MVP | The country of primary operation. Used to disambiguate searches (e.g. "Tasty Bites" in `GB` vs `AU`). |
| `locations` | array of {city, region, country} | 🟢 MVP | Physical locations (branches, offices). Used in geo-targeted search queries. |
| `industry` | {category, subcategory} | 🟢 MVP | Industry classification. Used to scope search queries and contextualize AI analysis. |
| `aliases` | string[] | 🟢 MVP | Other names the company is known by (e.g. "TB Restaurants", "Tasty Bites Café"). Each alias generates its own search queries. Critical for discovery accuracy. |
| `social_handles` | array of {platform, handle} | 🟢 MVP | Known social media handles (e.g. `@tastybites` on Instagram). Used to discover and verify social profiles. |
| `known_brands` | string[] | 🟡 POST-MVP | Sub-brands owned by the company. Allows monitoring of brand portfolio. |
| `registration_number` | string (nullable) | 🟡 POST-MVP | Company registration number (Companies House, etc.). Helps entity resolution for directory listings. |
| `logo_url` | string (nullable) | 🟡 POST-MVP | URL of the company logo. Future: used for visual brand detection. |
| `founding_year` | integer (nullable) | 🟡 POST-MVP | Year the company was founded. Context for analysis. |
| `competitor_names` | string[] | 🔴 ENTERPRISE | Names of competitor companies to monitor for comparative analysis. |
| `naics_code` | string (nullable) | 🔴 ENTERPRISE | North American Industry Classification System code. |
| `sic_code` | string (nullable) | 🔴 ENTERPRISE | Standard Industrial Classification code for UK/EU context. |

### 2.2 Profile Validation Rules

- `company_name` is required and must be 2–200 characters.
- `primary_domain` must be a valid domain format (no protocol prefix, no path). Validated with a regex before storage.
- `social_handles` entries must include both `platform` (from a defined enum) and `handle` (non-empty string).
- `locations` entries must include at minimum `country`. `city` and `region` are optional but improve discovery quality.
- `industry.category` is required; `industry.subcategory` is optional.
- `aliases` must not contain duplicates and must not duplicate `company_name` or `display_name`.

### 2.3 Profile Completeness Score

The platform will compute a profile completeness score to encourage thorough setup. More complete profiles yield higher-quality discovery results.

| Fields Provided | Completeness Score | Discovery Quality |
|---|---|---|
| `company_name`, `primary_domain` only | 20% | Very low — many false positives |
| + `country`, `industry`, `locations` | 50% | Moderate — geo-disambiguation works |
| + `aliases`, `social_handles` | 80% | Good — social sources discoverable |
| All MVP fields | 100% | Best — entity resolution at full confidence |

---

## 3. Source Type Taxonomy

### 3.1 Overview

A "source" is any online location where content relevant to the company appears. Sources are typed — each type has its own extraction logic, polling interval, and entity resolution approach.

Sources are classified along two axes:

**Ownership:**
- `OWNED` — The company controls this presence (their own website, their own Facebook page).
- `THIRD_PARTY` — Another platform hosts the content (a Google review, a Yelp listing). The company can claim it but does not control what visitors post.

**Data Access Method:**
- `SCRAPING` — Content is fetched via Crawl4AI (subject to scraping ethics constraints).
- `OFFICIAL_API` — Content is fetched via a platform's official API (preferred where available).
- `CONNECTED_ACCOUNT` — Requires OAuth or credential connection by the customer (enterprise).

### 3.2 Source Type Reference Table

#### Core Web Sources — MVP

| Source Type ID | Description | Ownership | Access Method | MVP Status |
|---|---|---|---|---|
| `COMPANY_WEBSITE` | The company's main domain — homepage, about page, contact page. Monitors for structural or content changes. | OWNED | SCRAPING | 🟢 MVP |
| `GOOGLE_BUSINESS` | Google Business Profile — business info, hours, description, photos. | OWNED | OFFICIAL_API (partial) / SCRAPING | 🟢 MVP |
| `GOOGLE_MAPS_LISTING` | Google Maps listing with reviews and star ratings. The primary source of customer reviews for most businesses. | THIRD_PARTY | SCRAPING | 🟢 MVP |
| `FACEBOOK_PAGE` | A Facebook Page — public posts, about section, and public reviews/recommendations. | OWNED or THIRD_PARTY | SCRAPING (public only) | 🟢 MVP |
| `INSTAGRAM_PROFILE` | A public Instagram account — posts, captions, hashtags. | OWNED or THIRD_PARTY | SCRAPING (public only) | 🟢 MVP |
| `YOUTUBE_CHANNEL` | A public YouTube channel — video titles, descriptions, public video comments (first 20 per video). | OWNED or THIRD_PARTY | OFFICIAL_API (preferred) / SCRAPING | 🟢 MVP |

#### Review Platforms — MVP

| Source Type ID | Description | Ownership | Access Method | MVP Status |
|---|---|---|---|---|
| `TRUSTPILOT` | Trustpilot listing — public reviews and aggregate rating. One of the highest-trust review platforms. | THIRD_PARTY | SCRAPING | 🟢 MVP |
| `YELP` | Yelp listing — reviews, star ratings, and business details. Dominant in US food/service businesses. | THIRD_PARTY | SCRAPING | 🟢 MVP |
| `TRIPADVISOR` | TripAdvisor listing — reviews, ratings, and ranks. Dominant for hospitality and tourism. | THIRD_PARTY | SCRAPING | 🟢 MVP |
| `PRODUCT_HUNT` | Product Hunt listing — upvotes, comments, and reviews. Relevant for tech and consumer product companies. | THIRD_PARTY | SCRAPING | 🟢 MVP |
| `G2` | G2 software review platform — reviews with structured criteria ratings. Relevant for B2B SaaS companies. | THIRD_PARTY | SCRAPING | 🟢 MVP |
| `CAPTERRA` | Capterra software directory — reviews and ratings. Relevant for B2B software. | THIRD_PARTY | SCRAPING | 🟢 MVP |

#### Discovery / Mention Sources — POST-MVP

| Source Type ID | Description | Ownership | Access Method | MVP Status |
|---|---|---|---|---|
| `NEWS_ARTICLE` | Online news articles that mention the company by name. Includes local, regional, and national publications. | THIRD_PARTY | SCRAPING | 🟡 POST-MVP |
| `INDUSTRY_BLOG` | Industry blog posts or trade publication articles mentioning the company. | THIRD_PARTY | SCRAPING | 🟡 POST-MVP |
| `REDDIT_THREAD` | Reddit threads where the company is mentioned — subreddits, comments, upvotes. | THIRD_PARTY | OFFICIAL_API (Reddit API) | 🟡 POST-MVP |
| `LINKEDIN_COMPANY` | LinkedIn Company Page — public posts, follower count, employee count. | OWNED or THIRD_PARTY | SCRAPING (public only) | 🟡 POST-MVP |
| `TWITTER_X_MENTION` | Public Twitter/X mentions via public search — tweets containing the company name or handle. | THIRD_PARTY | OFFICIAL_API (Twitter API v2) | 🟡 POST-MVP |

#### Directory Sources — POST-MVP

| Source Type ID | Description | Ownership | Access Method | MVP Status |
|---|---|---|---|---|
| `YELLOW_PAGES` | Yellow Pages or equivalent online business directory listing. | THIRD_PARTY | SCRAPING | 🟡 POST-MVP |
| `INDUSTRY_DIRECTORY` | Industry-specific directories (e.g. medical, legal, trade associations). | THIRD_PARTY | SCRAPING | 🟡 POST-MVP |
| `CHAMBER_OF_COMMERCE` | Chamber of commerce or local business association listing. | THIRD_PARTY | SCRAPING | 🟡 POST-MVP |

#### Connected Account Sources — ENTERPRISE

| Source Type ID | Description | Ownership | Access Method | MVP Status |
|---|---|---|---|---|
| `CONNECTED_EMAIL` | Customer's own Gmail or Outlook inbox — inbound customer emails (complaint, praise, inquiry). | OWNED | CONNECTED_ACCOUNT (OAuth) | 🔴 ENTERPRISE |
| `WHATSAPP_BUSINESS` | WhatsApp Business API — inbound messages from customers. | OWNED | CONNECTED_ACCOUNT (official API) | 🔴 ENTERPRISE |
| `CRM_IMPORT` | Structured import from CRM systems (Salesforce, HubSpot, etc.) — customer records, support notes. | OWNED | DATA_IMPORT | 🔴 ENTERPRISE |
| `ZENDESK` | Zendesk support tickets — customer-submitted issues and resolutions. | OWNED | OFFICIAL_API | 🔴 ENTERPRISE |
| `FRESHDESK` | Freshdesk support tickets. | OWNED | OFFICIAL_API | 🔴 ENTERPRISE |
| `APPLE_APP_STORE` | Apple App Store reviews for the company's iOS app. | THIRD_PARTY | OFFICIAL_API | 🔴 ENTERPRISE |
| `GOOGLE_PLAY` | Google Play Store reviews for the company's Android app. | THIRD_PARTY | OFFICIAL_API | 🔴 ENTERPRISE |

### 3.3 Source Type Classification Summary

```
Source Types by Access Method:

OFFICIAL_API    ── YOUTUBE_CHANNEL, REDDIT_THREAD, TWITTER_X_MENTION, 
                   ZENDESK, FRESHDESK, APPLE_APP_STORE, GOOGLE_PLAY,
                   WHATSAPP_BUSINESS

SCRAPING        ── COMPANY_WEBSITE, GOOGLE_MAPS_LISTING, FACEBOOK_PAGE,
                   INSTAGRAM_PROFILE, TRUSTPILOT, YELP, TRIPADVISOR,
                   PRODUCT_HUNT, G2, CAPTERRA, NEWS_ARTICLE, INDUSTRY_BLOG,
                   LINKEDIN_COMPANY, YELLOW_PAGES, INDUSTRY_DIRECTORY,
                   CHAMBER_OF_COMMERCE

CONNECTED_ACCOUNT── CONNECTED_EMAIL, CRM_IMPORT
```

---

## 4. Feedback Model Definition

Feedback flows through four layers of processing. Each layer builds on the previous. Downstream layers depend on upstream layers being complete.

### 4.1 Layer Overview

```
Raw Content (Layer 1)
      │
      ▼ extraction + cleaning
Normalized Feedback (Layer 2)
      │
      ▼ OmniRoute AI analysis
Analysis Result (Layer 3)
      │
      ▼ aggregation job (nightly)
Derived Insight (Layer 4)
```

### 4.2 Layer 1: Raw Source Content

**What it is:** The exact content fetched from a source URL, before any processing. This is the ground truth. It is stored in full to allow re-processing if extraction logic changes.

**Why we store raw content:** If the extractor has a bug, or if the AI model is upgraded, we can re-run extraction and analysis on already-fetched content without needing to re-scrape.

| Field | Type | Description |
|---|---|---|
| `raw_html` | text (nullable) | Full HTML response body of the fetched page, if HTML. |
| `raw_text` | text (nullable) | Plain text variant, if the source returns text/JSON rather than HTML. |
| `source_url` | string | The exact URL that was fetched. |
| `fetched_at` | timestamp | When the fetch occurred (UTC). |
| `http_status` | integer | HTTP response status code (200, 404, 429, etc.). |
| `content_hash` | string | SHA-256 hash of the raw content. Used to detect when content has changed since last fetch. If the hash matches the previous fetch, no new items need to be extracted. |
| `metadata` | JSONB | Any additional fetch metadata (response headers relevant to rate limiting, encoding, etc.). |

**Storage note:** Raw HTML can be large. For review platforms, raw content may be stored in compressed form (gzip) or in object storage (S3-compatible), with a reference pointer in the database record.

### 4.3 Layer 2: Normalized Feedback

**What it is:** Individual feedback items extracted and cleaned from the raw content. One raw fetch may produce multiple normalized items (e.g. a Yelp page contains 20 reviews — each review is a separate normalized item).

**Key design principle:** Author information is minimized. For public sources, the commenter's name is used only to generate a deduplication hash — it is never stored as a name, email, or any PII.

| Field | Type | Description |
|---|---|---|
| `id` | UUID | Unique identifier for this feedback item. |
| `source_id` | UUID | Which source this came from. |
| `ingestion_run_id` | UUID | Which ingestion run extracted this item. |
| `author_identifier` | string | Opaque hash derived from source + author display name (or profile URL). NOT a name, NOT an email. Used for cross-item deduplication only. |
| `posted_at` | timestamp | The original date/time the feedback was posted on the platform (not the fetch date). |
| `content_text` | text | Cleaned text content of the feedback (whitespace normalized, HTML tags stripped, null bytes removed). |
| `rating` | float (nullable) | Star rating normalized to 1.0–5.0 scale. NULL if the source does not use ratings (e.g. news articles, social posts). |
| `language_code` | string | ISO 639-1 language code detected from the content (e.g. `en`, `fr`, `de`). |
| `source_type` | SourceType enum | Denormalized from the source for query efficiency. |
| `is_duplicate` | boolean | True if this item's content_hash + source + author_identifier matches a previously stored item. Marked but not deleted — deduplication is conservative. |
| `word_count` | integer | Approximate word count of content_text. Used to filter out very short/spam items during analysis. |

### 4.4 Layer 3: AI Analysis

**What it is:** Structured analysis results attached to a normalized feedback item after it has been processed by OmniRoute. These fields are nullable — they are absent until the AI analysis job runs.

**AI gateway:** All analysis is routed through OmniRoute. The specific underlying model (e.g. GPT-4o, Claude 3.5, Gemini 1.5 Pro) is configured in OmniRoute routing rules, not hardcoded in the application. This allows model upgrades without code changes.

| Field | Type | Description |
|---|---|---|
| `sentiment_label` | Sentiment enum (nullable) | One of: `POSITIVE`, `NEGATIVE`, `NEUTRAL`, `MIXED`. |
| `sentiment_score` | float (nullable) | Confidence of the sentiment classification. Range 0.0–1.0. |
| `topics` | JSONB (nullable) | Array of `{topic_name: string, sentiment: Sentiment, confidence: float}`. Topics are open-ended strings extracted from the content (e.g. "wait time", "staff friendliness", "price"). |
| `intent` | Intent enum (nullable) | One of: `COMPLAINT`, `PRAISE`, `QUESTION`, `SUGGESTION`, `NEUTRAL`. The author's apparent intent. |
| `key_entities` | JSONB (nullable) | Named entities extracted from the content: locations mentioned, product names, staff names (if relevant to feedback context — e.g. "John at the counter was great"). These are extracted for context, not linked to PII profiles. |
| `language_quality` | LanguageQuality enum (nullable) | One of: `READABLE`, `GARBLED`, `SPAM`. Used to filter low-quality items from insight aggregations. |
| `analysis_model` | string (nullable) | The model identifier that produced this analysis (as reported by OmniRoute). Stored for audit, reproducibility, and drift detection. |
| `analyzed_at` | timestamp (nullable) | When analysis was completed. |
| `analysis_version` | integer (nullable) | Version number of the analysis prompt schema. Allows identifying items that need re-analysis when prompts change. |
| `analysis_error` | string (nullable) | If analysis failed after retries, the error message is stored here. The item is otherwise retained and can be retried. |

### 4.5 Layer 4: Derived Insight

**What it is:** Aggregated, cross-item computations. These are NOT per-item — they are computed from many items across time periods.

**Key principle:** Insights are computed on a schedule (nightly aggregation job), not in real-time. They represent patterns, not individual events.

**Insight types:**

| Insight Type | What It Measures | Computation |
|---|---|---|
| `SENTIMENT_TREND` | How average sentiment is changing over time | Compare average `sentiment_score` this week vs last week, by topic |
| `VOLUME_ANOMALY` | Unusual spikes or drops in feedback volume | Compare item count in the last 24h vs 7-day rolling average; flag if > 2 standard deviations |
| `TOPIC_SPIKE` | A topic appearing much more than usual | Topics in >20% of this week's items that were in <10% of last week's items |
| `CROSS_SOURCE_PATTERN` | Same issue appearing across multiple independent sources | Topic trending negatively in ≥3 different source types simultaneously |
| `RATING_DECLINE` | Average star rating falling over time | Average star rating declining across 3 consecutive weekly periods |

**Derived insights are stored in the `Insight` entity** (defined in the domain model). They are not fields on `FeedbackItem`.

---

## 5. Customer Intelligence Approach: Privacy-First

### 5.1 Core Principle

This platform analyzes **patterns in public content**, not **individuals**. The two must never be confused.

A customer who leaves a 1-star Google review is a member of the public expressing an opinion on a public platform. This platform's job is to surface that sentiment and topic — not to identify who that person is, aggregate them into a profile, or link them to a CRM record.

### 5.2 What We Do Not Do

- We do not extract, store, or display reviewer names or profile URLs as PII.
- We do not attempt to link public review authors to email addresses, phone numbers, or other identity data.
- We do not build profiles of individual commenters.
- We do not cross-reference public commenters with our customer's own customer records (without explicit enterprise opt-in and proper data processing agreements).
- We do not scrape private or authenticated content (content behind login walls, private social posts, direct messages).

### 5.3 Author Anonymization

When extracting a feedback item from a public source:

1. The reviewer's display name (e.g. "Sarah J." on Google) is captured temporarily during extraction.
2. A one-way hash is computed: `SHA-256(source_type + "|" + display_name_or_profile_url)`.
3. The hash is stored as `author_identifier`. The raw name is discarded.
4. The `author_identifier` is used only for deduplication: to detect if the same person left the same review on multiple occasions, or if the same review appears in multiple scrape runs.

The `author_identifier` is opaque — it cannot be reversed. No employee or user of the platform can determine who wrote a given review from this field alone.

### 5.4 Capability Classification by Privacy Level

| Capability | Privacy Level | MVP Status |
|---|---|---|
| Anonymous pattern analysis (sentiment trends, topic trends) | No PII — aggregated only | 🟢 MVP |
| Keyword and topic tracking (no reviewer identity) | No PII | 🟢 MVP |
| Author deduplication via opaque hash | Pseudonymous, non-reversible | 🟢 MVP |
| Review text display (truncated, in-app only) | Publicly available content | 🟢 MVP |
| Customer matching via CRM import | Requires explicit consent + DPA | 🔴 ENTERPRISE |
| Opt-in customer profiling (known customers) | Requires consent | 🔴 ENTERPRISE |
| Competitive intelligence (monitoring competitors) | Legal review required | 🔴 ENTERPRISE |

### 5.5 GDPR and Legal Considerations

**Lawful basis for processing public content:**

Scraping and analyzing publicly available review content is generally permissible under the lawful basis of "legitimate interests" (Article 6(1)(f) GDPR), provided:

1. The data subjects (reviewers) have a reasonable expectation that their publicly posted content may be processed.
2. Processing is limited to what is necessary (no unnecessary PII extraction).
3. A balancing test confirms the legitimate interest is not overridden by the individual's rights.

**Actions taken to minimize risk:**

- No PII stored for public commenters (author name discarded post-hashing).
- Content text retained only as-extracted; no enhancement or enrichment.
- Retention limits: raw content deleted after 90 days; normalized items retained for analysis period; analysis results retained per plan limits.
- Robots.txt respected for all scraping operations.

**For enterprise connected-account features:**

- A Data Processing Agreement (DPA) is required before enabling CRM import or connected email features.
- Explicit customer consent required for individual profiling.
- Data isolation: connected account data never co-mingled with public scrape data at the storage layer.

---

## 6. Monitoring Requirements

### 6.1 Polling Intervals by Source Type

Polling intervals balance freshness against rate limit risk and respect for the target platform.

| Source Type | Default Interval | Rationale |
|---|---|---|
| `GOOGLE_MAPS_LISTING` | Every 4 hours | Reviews appear frequently; changes materially affect reputation |
| `INSTAGRAM_PROFILE` | Every 2 hours | Social content moves fast; public posts may reference brand |
| `FACEBOOK_PAGE` | Every 2 hours | Same as Instagram |
| `YOUTUBE_CHANNEL` | Every 8 hours | Video content is lower-frequency; comment ingestion is heavier |
| `TRUSTPILOT` | Every 6 hours | Review platforms update regularly; not as fast as social |
| `YELP` | Every 6 hours | Same as Trustpilot |
| `TRIPADVISOR` | Every 6 hours | Same as Trustpilot |
| `PRODUCT_HUNT` | Every 8 hours | Less frequent activity; launch peaks are rare |
| `G2` | Every 12 hours | B2B review cadence is slower |
| `CAPTERRA` | Every 12 hours | Same as G2 |
| `NEWS_ARTICLE` (mention tracking) | Daily | News articles are discovered, not updated frequently |
| `COMPANY_WEBSITE` | Weekly | Structural changes are rare; change detection sufficient |
| `LINKEDIN_COMPANY` | Every 8 hours | Post cadence is moderate |
| `REDDIT_THREAD` | Every 4 hours | Active threads can move quickly |
| `YELLOW_PAGES` | Weekly | Directory listings rarely change |
| `INDUSTRY_DIRECTORY` | Weekly | Same as Yellow Pages |
| `CONNECTED_EMAIL` | Near-real-time (webhook) | POST-MVP — webhook push from mail provider |

**Interval overrides:** Enterprise customers may configure custom intervals for specific sources within plan limits. Minimum interval is 30 minutes for any source type.

### 6.2 Change Detection Strategy

Before extracting and normalizing items from a fetch, the system checks whether the content has changed:

1. Compute `SHA-256` hash of the raw fetched content.
2. Compare against `MonitoringTarget.last_content_hash`.
3. If hashes match: log the check, update `last_checked_at`, schedule next check. No extraction triggered.
4. If hashes differ: trigger full extraction pipeline. Update `last_content_hash` with new hash.

**Exception:** Review platforms dynamically load content via JavaScript. The hash comparison applies to the rendered HTML (post-JavaScript execution via Crawl4AI headless browser), not the raw HTTP response.

### 6.3 Rate Limiting Requirements

The platform must not overload any target platform with requests. Per-domain rate limits are enforced at the scraping layer.

| Platform Category | Max Requests Per Hour | Backoff Strategy |
|---|---|---|
| Google (Maps/Business) | 10 per hour per source | Exponential: 1m, 5m, 15m, 1h |
| Facebook / Instagram | 5 per hour per source | Exponential: 5m, 30m, 2h |
| Trustpilot / Yelp / TripAdvisor | 10 per hour per source | Exponential: 2m, 10m, 30m |
| News sites | 2 per hour per domain | Exponential: 5m, 30m, 2h |
| Generic web | 5 per hour per domain | Exponential: 2m, 10m, 30m |

**Global limits:**
- No more than 1 request per 10 seconds to any single domain (across all organizations).
- Shared rate limit pool: if one organization's sources exhaust the rate limit for a domain, other organizations' sources to that same domain are also delayed.

### 6.4 Error Handling

Monitoring targets track consecutive failures. The system responds to errors progressively.

| Condition | System Action |
|---|---|
| HTTP 429 (rate limited) | Pause monitoring target for 1 hour; retry with backoff |
| HTTP 404 (source not found) | Mark source as potentially dead; alert customer; pause for 24h |
| HTTP 5xx (server error) | Retry after exponential backoff; alert if failing for >6h |
| Content format changed (extraction fails) | Mark `EXTRACTION_FAILED`; alert engineering team; retain raw content for manual review |
| Timeout (Crawl4AI timeout) | Retry once after 5 minutes; if fails again, log and schedule next normal check |
| 3 consecutive failures | Set `MonitoringTarget.status = ERROR`; send alert to customer |
| 24 consecutive hours of failures | Send critical alert to customer; suggest source may be permanently unavailable |
| Source returns empty content | Log; do not update content hash; schedule retry after 30 minutes |

**Dead source recovery:** When a source that was in `ERROR` status successfully returns content, the status is automatically reset to `ACTIVE` and the consecutive error count is cleared.

### 6.5 Alert Delivery Channels

Alerts are generated by the Alert Evaluator and dispatched via configured channels.

| Channel | MVP Status | Configuration |
|---|---|---|
| Email | 🟢 MVP | Sent to all users in the organization. Configurable per-user opt-out. |
| In-app notification | 🟢 MVP | Displayed in dashboard notification center. Persisted, manually dismissed. |
| Webhook | 🟡 POST-MVP | Customer configures an endpoint URL. Platform sends JSON payload with signature. Retried on 4xx/5xx. |
| Slack | 🟡 POST-MVP | OAuth connection to customer's Slack workspace. Alert posted to configured channel. |
| Microsoft Teams | 🟡 POST-MVP | Incoming webhook to configured Teams channel. |
| Push notification | 🔴 ENTERPRISE | Mobile app push notification (requires Expo/React Native mobile app — future phase). |

**Alert throttling:** To prevent alert fatigue, a maximum of 3 email alerts per organization per hour are sent. Additional alerts in that window are batched into a digest sent at the next hour boundary.

---

## 7. Non-Functional Requirements

### 7.1 Security

- All server-to-database communication is over TLS.
- Supabase RLS policies enforce tenant isolation on every table — a query from one organization cannot return rows belonging to another.
- All scraped URLs are validated against an SSRF allowlist/blocklist before the scraping layer processes them. Internal IP ranges (10.x.x.x, 172.16.x.x, 192.168.x.x, 127.x.x.x, `localhost`) are blocked.
- AI prompts include scraped content. This content is treated as untrusted input. Prompt injection mitigations are applied (content is isolated in clearly delimited sections; system prompt does not grant tool-use to the content section).
- Secrets (OmniRoute API keys, scraping service tokens) are stored in environment variables, never in code or database.

### 7.2 Reliability

- Ingestion runs and AI analysis jobs are retryable. Jobs that fail are automatically retried up to 3 times with exponential backoff before being marked as failed.
- Failed feedback items retain their `raw_content` so they can be reprocessed when the underlying issue is fixed.
- The system degrades gracefully: if the AI analysis service is unavailable, feedback items are stored and queued; the dashboard still shows ingested items without analysis tags.

### 7.3 Scalability (Phase 1 Targets)

| Metric | Phase 1 Target |
|---|---|
| Organizations | Up to 100 tenants |
| Sources per organization | Up to 50 |
| Feedback items per day (total) | Up to 10,000 |
| AI analysis throughput | Up to 1,000 items per hour |
| Dashboard load time (p95) | < 2 seconds |

### 7.4 Data Retention

| Data Type | Retention Period |
|---|---|
| Raw scraped HTML | 90 days |
| Normalized feedback items | Per plan (Starter: 1 year, Professional: 3 years, Enterprise: unlimited) |
| AI analysis results | Same as normalized items |
| Insights and reports | 5 years |
| Audit logs | 7 years |
| Discovery candidates (rejected) | 30 days |
