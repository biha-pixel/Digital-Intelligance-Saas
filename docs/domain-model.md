# Domain Model — Customer Experience Intelligence SaaS

**Document version**: 1.0  
**Phase**: Phase 1 — Domain Design  
**Status**: Draft  
**Author**: Architect Agent  
**Date**: 2026-10-07  

> **Scope:** This document defines the conceptual domain model only — entities, relationships, value objects, state machines, aggregate boundaries, and domain events. No database tables or SQL are defined here. See `docs/discovery-architecture.md` and `docs/monitoring-architecture.md` for the operational pipeline designs.

---

## Table of Contents

1. [Entity Relationship Overview](#1-entity-relationship-overview)
2. [Entity Catalog](#2-entity-catalog)
3. [Value Objects](#3-value-objects)
4. [State Machine Diagrams](#4-state-machine-diagrams)
5. [Aggregate Boundaries](#5-aggregate-boundaries)
6. [Domain Events](#6-domain-events)
7. [Invariants](#7-invariants)

---

## 1. Entity Relationship Overview

The following ASCII diagram shows the full domain model. Read it top-to-bottom — it traces the flow from an organization signing up, through discovery finding sources, through monitoring fetching content, through AI analysis turning it into insights.

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                              ORGANIZATION (Tenant Root)                        │
│                    id, name, plan, createdAt, status                           │
└───────────────────────────┬────────────────────────────────────────────────────┘
                            │ 1:1
                            ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│                            COMPANY PROFILE (Identity Seed)                     │
│          companyName, displayName, primaryDomain, country,                     │
│          locations[], aliases[], socialHandles[], industry                     │
└──────────────────────┬─────────────────────────────────────────────────────────┘
                       │ triggers
                       ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│                              DISCOVERY RUN                                     │
│              id, status, triggeredAt, completedAt, queriesGenerated            │
└────────────────────────────┬───────────────────────────────────────────────────┘
                             │ produces many
                             ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│                          DISCOVERY CANDIDATE                                   │
│        id, url, sourceType, ownershipSignal, confidenceScore, status          │
└──────────────┬─────────────────────────────────────────────────────────────────┘
               │ verified candidates become
               ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│                                  SOURCE                                        │
│     id, url, sourceType, ownership, verificationStatus, isActive               │
└──────────────────────────────┬─────────────────────────────────────────────────┘
                               │ 1:1
                               ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│                           MONITORING TARGET                                    │
│        id, pollingIntervalHours, lastCheckedAt, lastContentHash, status        │
└────────────────────────────────┬───────────────────────────────────────────────┘
                                 │ produces many
                                 ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│                            INGESTION RUN                                       │
│       id, status, startedAt, completedAt, itemsFound, itemsNew, error         │
└──────────────────────────────┬────────────────────────────────────────────────-┘
                               │ produces many
                               ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│                            FEEDBACK ITEM                                       │
│   id, sourceId, authorIdentifier (hash), postedAt, contentText,               │
│   rating, languageCode, isDuplicate, wordCount                                 │
└───────────────────────────────┬────────────────────────────────────────────────┘
                                │ 1:1 (when analysed)
                                ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│                               ANALYSIS                                         │
│   id, feedbackItemId, sentiment, sentimentScore, topics[],                     │
│   intent, keyEntities[], analysisModel, analyzedAt, analysisVersion            │
└───────────────────────────────┬────────────────────────────────────────────────┘
                                │ aggregated by nightly job into
                                ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│                                INSIGHT                                         │
│       id, type, scope, periodStart, periodEnd, payload, severity               │
└──────────┬──────────────────────────────────────────────────────────┬──────────┘
           │ evaluated against                                         │ compiled into
           ▼                                                           ▼
┌────────────────────────┐                              ┌─────────────────────────┐
│       ALERT RULE       │                              │         REPORT          │
│  id, alertType,        │                              │  id, type, periodStart, │
│  threshold, channel    │                              │  periodEnd, payload     │
└────────────┬───────────┘                              └─────────────────────────┘
             │ triggers
             ▼
┌────────────────────────┐
│         ALERT          │
│  id, alertRuleId,      │
│  triggeredAt, channel, │
│  deliveryStatus        │
└────────────────────────┘
```

---

## 2. Entity Catalog

Every entity is listed with its attributes, types, and phase markers. No SQL — these are conceptual domain entities.

---

### 2.1 Organization

The root tenant entity. Every other entity in the system belongs to exactly one Organization. This is the unit of billing, access control, and data isolation.

🟢 **MVP**

| Attribute | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Primary identifier |
| `name` | string | Organization display name |
| `plan` | PlanTier | FREE \| STARTER \| PRO \| ENTERPRISE |
| `status` | OrgStatus | ACTIVE \| SUSPENDED \| CANCELLED |
| `createdAt` | timestamp | When the org was created |
| `ownerUserId` | UUID | The user who created and owns the org |
| `maxSources` | integer | Plan limit on sources |
| `maxDiscoveryRunsPerMonth` | integer | Plan limit on discovery runs |

🟡 **POST-MVP additions**

| Attribute | Type | Description |
|-----------|------|-------------|
| `billingCustomerId` | string | Stripe customer ID |
| `billingInterval` | enum | MONTHLY \| ANNUAL |
| `trialEndsAt` | timestamp | When free trial expires |

🔴 **ENTERPRISE additions**

| Attribute | Type | Description |
|-----------|------|-------------|
| `ssoProvider` | string | SAML/OIDC provider identifier |
| `dataResidencyRegion` | string | Data residency enforcement region |
| `contractId` | string | Enterprise contract reference |

---

### 2.2 CompanyProfile

The identity profile that describes who the company is. This is the **seed** for discovery. The richer this entity, the better the discovery results.

One Organization has exactly one CompanyProfile at MVP. Multiple profiles per org are a post-MVP feature (e.g. for agencies managing multiple brands).

🟢 **MVP**

| Attribute | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Primary identifier |
| `organizationId` | UUID | Owning organization |
| `companyName` | string | Legal registered name (required) |
| `displayName` | string? | Trading name if different from legal name |
| `primaryDomain` | string | Main website domain, e.g. `acme.com` (required) |
| `country` | string | ISO 3166-1 alpha-2 country code (required) |
| `locations` | Location[] | Physical offices/branches |
| `industry` | Industry | `{category: string, subcategory?: string}` |
| `aliases` | string[] | Other names the company uses |
| `socialHandles` | SocialHandle[] | `{platform: SocialPlatform, handle: string}[]` |
| `completenessScore` | integer | 0–100 computed completeness score |
| `createdAt` | timestamp | When profile was created |
| `updatedAt` | timestamp | When profile was last updated |

🟡 **POST-MVP additions**

| Attribute | Type | Description |
|-----------|------|-------------|
| `knownBrands` | string[] | Sub-brands the org owns |
| `registrationNumber` | string? | Companies House / State registration number |
| `logoUrl` | string? | URL of company logo |
| `foundingYear` | integer? | Year company was founded |

🔴 **ENTERPRISE additions**

| Attribute | Type | Description |
|-----------|------|-------------|
| `competitorNames` | string[] | Competitor brands to monitor |
| `naicsCode` | string? | NAICS industry code |
| `sicCode` | string? | SIC code (UK/EU) |

**Validation rules:**
- `companyName` is required, 2–200 characters
- `primaryDomain` must be a valid domain (no scheme, no path)
- `aliases` must not duplicate `companyName` or `displayName`
- `socialHandles` entries must include both `platform` and a non-empty `handle`

---

### 2.3 Source

A source is any online location where content relevant to the company appears. Sources are discovered (via DiscoveryRun) or added manually by users.

🟢 **MVP**

| Attribute | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Primary identifier |
| `organizationId` | UUID | Owning organization |
| `companyProfileId` | UUID | Associated company profile |
| `url` | string | Canonical URL of the source |
| `sourceType` | SourceType | Classified type (see Section 3) |
| `ownership` | SourceOwnership | OWNED \| CLAIMED \| THIRD_PARTY \| UNKNOWN |
| `verificationStatus` | VerificationStatus | UNVERIFIED \| PENDING \| VERIFIED \| REJECTED |
| `verifiedAt` | timestamp? | When it was verified |
| `verifiedBy` | UUID? | User who verified (or `system` for auto-verify) |
| `addedVia` | SourceAddedVia | DISCOVERY \| MANUAL \| PROFILE (added from social handle) |
| `isActive` | boolean | Whether monitoring is enabled |
| `displayName` | string? | Human-readable label for the source |
| `createdAt` | timestamp | When the source was registered |

**Note on auto-verification:** A candidate with confidence ≥ 0.80 is auto-verified by the system and `verifiedBy` is set to `system`. Candidates with confidence 0.50–0.79 enter the human review queue. Candidates below 0.50 are auto-rejected and not registered as sources.

🟡 **POST-MVP additions**

| Attribute | Type | Description |
|-----------|------|-------------|
| `oauthTokenId` | UUID? | Linked OAuth credential (for connected accounts) |
| `customPollingIntervalHours` | integer? | Override for plan-level custom intervals |
| `tags` | string[] | User-defined labels for grouping |

---

### 2.4 DiscoveryRun

A discovery run is one execution of the automated discovery pipeline. It generates search queries from the company profile, finds candidate URLs, scores them, and routes them to auto-registration or human review.

🟢 **MVP**

| Attribute | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Primary identifier |
| `organizationId` | UUID | Owning organization |
| `companyProfileId` | UUID | Profile that was used as seed |
| `status` | DiscoveryStatus | QUEUED \| RUNNING \| COMPLETED \| FAILED |
| `trigger` | DiscoveryTrigger | MANUAL \| PROFILE_UPDATED \| SCHEDULED |
| `queriesGenerated` | integer | Number of search queries generated |
| `candidatesFound` | integer | Total candidate URLs returned |
| `candidatesAutoVerified` | integer | Candidates auto-routed to sources |
| `candidatesQueued` | integer | Candidates queued for human review |
| `candidatesRejected` | integer | Candidates discarded (low confidence) |
| `startedAt` | timestamp | When the run began |
| `completedAt` | timestamp? | When the run finished |
| `errorMessage` | string? | Error if status is FAILED |
| `createdAt` | timestamp | When the run was created |

---

### 2.5 DiscoveryCandidate

A single URL surfaced during a DiscoveryRun. Candidates are evaluated, scored, and routed — they are the raw outputs of search query execution before promotion to verified Sources.

🟢 **MVP**

| Attribute | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Primary identifier |
| `organizationId` | UUID | Owning organization |
| `discoveryRunId` | UUID | The run that found this candidate |
| `url` | string | Discovered URL (canonicalized) |
| `detectedSourceType` | SourceType? | Source type detected from URL pattern |
| `detectedOwnership` | SourceOwnership | Inferred ownership category |
| `confidenceScore` | float | 0.0–1.0 relevance confidence score |
| `confidenceSignals` | ConfidenceSignals | Breakdown of the confidence score components |
| `status` | CandidateStatus | PENDING \| APPROVED \| REJECTED \| DUPLICATE |
| `reviewedBy` | UUID? | User who reviewed (null if auto-processed) |
| `reviewedAt` | timestamp? | When it was reviewed |
| `promotedToSourceId` | UUID? | Source ID if approved → promoted |
| `foundViaQuery` | string | The search query that surfaced this URL |
| `discoveredAt` | timestamp | When the candidate was found |

**ConfidenceSignals value object:**
```typescript
interface ConfidenceSignals {
  nameMatchScore: number;       // 0.0–1.0
  domainMatchScore: number;     // 0.0–1.0
  handleMatchScore: number;     // 0.0–1.0
  typeRecognizedScore: number;  // 0.0–1.0
  industryRelevanceScore: number; // 0.0–1.0
}
```

---

### 2.6 MonitoringTarget

A MonitoringTarget is the operational schedule attached to a verified Source. While Source describes *what* the location is, MonitoringTarget describes *how and when* to poll it.

One Source has exactly one MonitoringTarget once it is VERIFIED and ACTIVE.

🟢 **MVP**

| Attribute | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Primary identifier |
| `organizationId` | UUID | Owning organization |
| `sourceId` | UUID | The source being monitored |
| `status` | MonitoringStatus | ACTIVE \| PAUSED \| ERROR \| DISABLED |
| `pollingIntervalHours` | float | How often to fetch (from source type defaults) |
| `nextCheckAt` | timestamp | Next scheduled fetch time |
| `lastCheckedAt` | timestamp? | When last successfully polled |
| `lastContentHash` | string? | SHA-256 of last fetched content (for change detection) |
| `consecutiveFailures` | integer | Count of consecutive failed fetches |
| `lastErrorAt` | timestamp? | When last failure occurred |
| `lastErrorMessage` | string? | Most recent error description |
| `createdAt` | timestamp | When monitoring began |

**MonitoringStatus transitions:**
```
ACTIVE ──► PAUSED (user pauses)
ACTIVE ──► ERROR (3 consecutive failures)
ERROR  ──► ACTIVE (successful fetch after error period)
ACTIVE ──► DISABLED (source deactivated or plan limit hit)
PAUSED ──► ACTIVE (user resumes)
```

---

### 2.7 IngestionRun

A single scrape execution for one MonitoringTarget. One IngestionRun fires each time the scheduler wakes up a MonitoringTarget.

🟢 **MVP**

| Attribute | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Primary identifier |
| `organizationId` | UUID | Owning organization |
| `monitoringTargetId` | UUID | Which monitoring target this run belongs to |
| `sourceId` | UUID | Denormalized source reference |
| `status` | IngestionStatus | QUEUED \| RUNNING \| COMPLETED \| FAILED \| SKIPPED |
| `skippedReason` | SkippedReason? | CONTENT_UNCHANGED \| RATE_LIMITED \| SOURCE_ERROR |
| `fetchUrl` | string | Exact URL fetched |
| `httpStatus` | integer? | HTTP response code |
| `contentHash` | string? | SHA-256 of fetched content |
| `contentChangedFromPrevious` | boolean? | Whether hash differs from last run |
| `itemsExtracted` | integer | Feedback items extracted from this fetch |
| `itemsNew` | integer | Items that were not previously seen |
| `itemsDuplicate` | integer | Items that matched previously stored items |
| `startedAt` | timestamp | When the fetch began |
| `completedAt` | timestamp? | When processing finished |
| `errorMessage` | string? | Error if status is FAILED |
| `retryCount` | integer | How many times this run has been retried |

---

### 2.8 FeedbackItem

A single unit of normalized customer feedback: one review, one social post, one forum comment. The fundamental data unit of the platform.

🟢 **MVP**

| Attribute | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Primary identifier |
| `organizationId` | UUID | Owning organization |
| `sourceId` | UUID | Which source this came from |
| `ingestionRunId` | UUID | Which ingestion run produced this |
| `authorIdentifier` | string | Opaque SHA-256 hash — NOT a name or email |
| `externalId` | string? | Platform's own ID for this item (for deduplication) |
| `postedAt` | timestamp | When the feedback was originally posted |
| `contentText` | text | Cleaned text content |
| `rating` | float? | Normalized rating 1.0–5.0 (null if not applicable) |
| `languageCode` | string | ISO 639-1 language code |
| `sourceType` | SourceType | Denormalized from source |
| `isDuplicate` | boolean | True if content+author+source matches a prior item |
| `wordCount` | integer | Word count of contentText |
| `rawContentRef` | string? | Reference to raw HTML in object storage |
| `createdAt` | timestamp | When this item was stored |

**Privacy note:** `authorIdentifier` is a one-way hash: `SHA-256(sourceType + "|" + authorDisplayName + "|" + authorProfileUrl)`. The raw display name is never persisted. The hash is used only for deduplication — it cannot be reversed to identify the author.

🟡 **POST-MVP additions**

| Attribute | Type | Description |
|-----------|------|-------------|
| `mediaUrls` | string[]? | Public URLs of attached images/video |
| `isReply` | boolean | Whether this is a reply to another item |
| `parentExternalId` | string? | externalId of the parent item |

---

### 2.9 Analysis

The AI analysis result for a single FeedbackItem. An Analysis is produced by the analysis pipeline after FeedbackItem is stored. It is attached to exactly one FeedbackItem.

All fields from the AI are validated by Zod schema before the Analysis record is saved. If validation fails, `validationPassed` is false and the raw response is retained for debugging.

🟢 **MVP**

| Attribute | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Primary identifier |
| `organizationId` | UUID | Owning organization |
| `feedbackItemId` | UUID | The feedback item this analysis describes |
| `sentiment` | Sentiment? | POSITIVE \| NEUTRAL \| NEGATIVE \| MIXED |
| `sentimentScore` | float? | Confidence 0.0–1.0 |
| `topics` | TopicTag[]? | `{topicName: string, sentiment: Sentiment, confidence: float}[]` |
| `intent` | Intent? | COMPLAINT \| PRAISE \| QUESTION \| SUGGESTION \| NEUTRAL |
| `keyEntities` | Entity[]? | `{text: string, type: EntityType, confidence: float}[]` |
| `languageQuality` | LanguageQuality? | READABLE \| GARBLED \| SPAM |
| `analysisModel` | string? | Model identifier (as reported by OmniRoute) |
| `analyzedAt` | timestamp? | When analysis completed |
| `analysisVersion` | integer | Prompt/schema version number |
| `rawAiResponse` | jsonb? | Full raw AI response (for audit and debugging) |
| `validationPassed` | boolean | Whether Zod schema validation passed |
| `validationErrors` | string[]? | If validation failed, the errors |
| `analysisError` | string? | If analysis failed after retries |
| `promptTokens` | integer? | Input token count (cost tracking) |
| `completionTokens` | integer? | Output token count (cost tracking) |
| `createdAt` | timestamp | When the analysis was stored |

🟡 **POST-MVP additions**

| Attribute | Type | Description |
|-----------|------|-------------|
| `urgency` | Urgency? | LOW \| MEDIUM \| HIGH \| CRITICAL |
| `urgencyReason` | string? | Why HIGH or CRITICAL urgency was assigned |

🔴 **ENTERPRISE additions**

| Attribute | Type | Description |
|-----------|------|-------------|
| `customTopicMatch` | string[]? | Topics matched from tenant-defined taxonomy |

---

### 2.10 Insight

An aggregated pattern computed from many FeedbackItems across a time period. Insights are produced by nightly aggregation jobs — they are not real-time.

🟢 **MVP**

| Attribute | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Primary identifier |
| `organizationId` | UUID | Owning organization |
| `type` | InsightType | See InsightType enum in Section 3 |
| `scope` | InsightScope | ALL_SOURCES \| SINGLE_SOURCE \| SOURCE_TYPE |
| `scopeRef` | UUID? | Source ID or null if scope is ALL_SOURCES |
| `periodStart` | timestamp | Start of the analysis window |
| `periodEnd` | timestamp | End of the analysis window |
| `severity` | InsightSeverity | INFO \| WARNING \| CRITICAL |
| `payload` | jsonb | Type-specific computed data (see below) |
| `createdAt` | timestamp | When this insight was generated |

**Payload schemas by InsightType:**

```typescript
// SENTIMENT_TREND
interface SentimentTrendPayload {
  currentPeriodScore: number;     // avg sentiment score this period
  previousPeriodScore: number;    // avg sentiment score last period
  delta: number;                  // change (positive = improving)
  itemCount: number;
}

// TOPIC_SPIKE
interface TopicSpikePayload {
  topic: string;
  currentPeriodShare: number;     // % of items mentioning topic this period
  previousPeriodShare: number;    // % last period
  delta: number;                  // change
  sentiment: Sentiment;           // dominant sentiment for this topic
}

// RATING_DECLINE
interface RatingDeclinePayload {
  sourceId: string;
  currentAvgRating: number;
  previousAvgRating: number;
  consecutiveDeclineWeeks: number;
}

// VOLUME_ANOMALY
interface VolumeAnomalyPayload {
  recentCount: number;            // items in last 24h
  rollingAverage: number;         // 7-day rolling average
  standardDeviationsFromMean: number;
  direction: 'SPIKE' | 'DROP';
}
```

---

### 2.11 AlertRule

A user-defined condition that triggers an Alert when an Insight matches the rule's threshold.

🟢 **MVP**

| Attribute | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Primary identifier |
| `organizationId` | UUID | Owning organization |
| `createdBy` | UUID | User who created the rule |
| `name` | string | Human-readable rule name |
| `alertType` | AlertType | The type of alert to fire |
| `isActive` | boolean | Whether the rule is enabled |
| `threshold` | jsonb | Rule-specific threshold parameters |
| `channels` | AlertChannel[] | Where to deliver the alert |
| `createdAt` | timestamp | When the rule was created |
| `updatedAt` | timestamp | When the rule was last updated |

**Example threshold payloads:**
```typescript
// For SENTIMENT_NEGATIVE_SPIKE:
{ deltaThreshold: -0.15, windowHours: 24 }

// For RATING_DROP:
{ minDrop: 0.5, consecutiveWeeks: 2 }

// For NEW_REVIEW_NEGATIVE:
{ maxRating: 2.5 }
```

---

### 2.12 Alert

A fired alert — one instance of an AlertRule condition being triggered.

🟢 **MVP**

| Attribute | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Primary identifier |
| `organizationId` | UUID | Owning organization |
| `alertRuleId` | UUID | The rule that triggered this alert |
| `insightId` | UUID? | The insight that triggered it |
| `alertType` | AlertType | Denormalized from rule |
| `triggeredAt` | timestamp | When the condition was met |
| `severity` | InsightSeverity | INFO \| WARNING \| CRITICAL |
| `summary` | string | Human-readable summary of what triggered |
| `channel` | AlertChannel | Where this was sent |
| `deliveryStatus` | DeliveryStatus | PENDING \| DELIVERED \| FAILED \| SUPPRESSED |
| `deliveredAt` | timestamp? | When delivery confirmed |
| `failureReason` | string? | Why delivery failed |
| `isAcknowledged` | boolean | Whether a user has dismissed this alert |
| `acknowledgedBy` | UUID? | Who acknowledged |
| `acknowledgedAt` | timestamp? | When acknowledged |

---

### 2.13 Report

A compiled report covering a time period. Reports are generated by a scheduled job and stored as structured payloads.

🟢 **MVP**

| Attribute | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Primary identifier |
| `organizationId` | UUID | Owning organization |
| `type` | ReportType | WEEKLY_SUMMARY \| MONTHLY_EXECUTIVE \| SOURCE_BREAKDOWN |
| `status` | ReportStatus | GENERATING \| COMPLETED \| FAILED |
| `periodStart` | timestamp | Report coverage start |
| `periodEnd` | timestamp | Report coverage end |
| `payload` | jsonb | Structured report data |
| `generatedAt` | timestamp? | When generation completed |
| `createdAt` | timestamp | When report was requested |

🟡 **POST-MVP additions**

| Attribute | Type | Description |
|-----------|------|-------------|
| `exportUrl` | string? | URL of exported PDF (if export requested) |
| `exportFormat` | string? | PDF \| CSV \| JSON |

---

## 3. Value Objects

Value objects are defined as TypeScript types/enums. They have no identity of their own — they are part of entity definitions. These are domain concepts, not database column types.

```typescript
// ─── Source Classification ─────────────────────────────────────────────────

enum SourceType {
  // Tier 1 — Owned (MVP)
  COMPANY_WEBSITE       = 'COMPANY_WEBSITE',
  GOOGLE_BUSINESS       = 'GOOGLE_BUSINESS',
  FACEBOOK_PAGE         = 'FACEBOOK_PAGE',
  INSTAGRAM_PROFILE     = 'INSTAGRAM_PROFILE',
  YOUTUBE_CHANNEL       = 'YOUTUBE_CHANNEL',

  // Tier 2 — Review Platforms (MVP)
  GOOGLE_MAPS_LISTING   = 'GOOGLE_MAPS_LISTING',
  TRUSTPILOT            = 'TRUSTPILOT',
  YELP                  = 'YELP',
  TRIPADVISOR           = 'TRIPADVISOR',
  PRODUCT_HUNT          = 'PRODUCT_HUNT',
  G2                    = 'G2',
  CAPTERRA              = 'CAPTERRA',

  // Tier 3 — Discovery/Mention Sources (POST-MVP)
  NEWS_ARTICLE          = 'NEWS_ARTICLE',
  INDUSTRY_BLOG         = 'INDUSTRY_BLOG',
  REDDIT_THREAD         = 'REDDIT_THREAD',
  LINKEDIN_COMPANY      = 'LINKEDIN_COMPANY',
  TWITTER_X_MENTION     = 'TWITTER_X_MENTION',

  // Tier 4 — Directory Sources (POST-MVP)
  YELLOW_PAGES          = 'YELLOW_PAGES',
  INDUSTRY_DIRECTORY    = 'INDUSTRY_DIRECTORY',
  CHAMBER_OF_COMMERCE   = 'CHAMBER_OF_COMMERCE',

  // Tier 5 — Connected Account Sources (ENTERPRISE)
  CONNECTED_EMAIL       = 'CONNECTED_EMAIL',
  WHATSAPP_BUSINESS     = 'WHATSAPP_BUSINESS',
  CRM_IMPORT            = 'CRM_IMPORT',
  ZENDESK               = 'ZENDESK',
  FRESHDESK             = 'FRESHDESK',
  APPLE_APP_STORE       = 'APPLE_APP_STORE',
  GOOGLE_PLAY           = 'GOOGLE_PLAY',
}

enum SourceOwnership {
  OWNED         = 'OWNED',        // Company controls content
  CLAIMED       = 'CLAIMED',      // Company has profile; others post reviews
  THIRD_PARTY   = 'THIRD_PARTY',  // Company has no control
  UNKNOWN       = 'UNKNOWN',      // Cannot be determined — needs review
}

enum VerificationStatus {
  UNVERIFIED    = 'UNVERIFIED',   // Just discovered; not reviewed
  PENDING       = 'PENDING',      // Queued for human review (medium confidence)
  VERIFIED      = 'VERIFIED',     // Confirmed as a valid source
  REJECTED      = 'REJECTED',     // Confirmed as not relevant
}

enum SourceOwnershipAccess {
  SCRAPING          = 'SCRAPING',
  OFFICIAL_API      = 'OFFICIAL_API',
  CONNECTED_ACCOUNT = 'CONNECTED_ACCOUNT',
}

enum SourceAddedVia {
  DISCOVERY   = 'DISCOVERY',    // Found by discovery pipeline
  MANUAL      = 'MANUAL',       // User manually added URL
  PROFILE     = 'PROFILE',      // Inferred from social handle in company profile
}

// ─── Analysis Outputs ──────────────────────────────────────────────────────

enum Sentiment {
  POSITIVE  = 'POSITIVE',
  NEUTRAL   = 'NEUTRAL',
  NEGATIVE  = 'NEGATIVE',
  MIXED     = 'MIXED',
}

enum Intent {
  COMPLAINT   = 'COMPLAINT',
  PRAISE      = 'PRAISE',
  QUESTION    = 'QUESTION',
  SUGGESTION  = 'SUGGESTION',
  NEUTRAL     = 'NEUTRAL',
}

enum Urgency {  // POST-MVP
  LOW       = 'LOW',
  MEDIUM    = 'MEDIUM',
  HIGH      = 'HIGH',
  CRITICAL  = 'CRITICAL',
}

enum LanguageQuality {
  READABLE  = 'READABLE',
  GARBLED   = 'GARBLED',
  SPAM      = 'SPAM',
}

enum EntityType {
  PRODUCT     = 'PRODUCT',
  FEATURE     = 'FEATURE',
  PERSON      = 'PERSON',
  PLACE       = 'PLACE',
  ISSUE       = 'ISSUE',
  COMPETITOR  = 'COMPETITOR',
}

// ─── Insights & Alerts ─────────────────────────────────────────────────────

enum InsightType {
  SENTIMENT_TREND         = 'SENTIMENT_TREND',         // MVP
  TOPIC_SPIKE             = 'TOPIC_SPIKE',             // MVP
  RATING_DECLINE          = 'RATING_DECLINE',          // MVP
  VOLUME_ANOMALY          = 'VOLUME_ANOMALY',          // POST-MVP
  CROSS_SOURCE_PATTERN    = 'CROSS_SOURCE_PATTERN',    // POST-MVP
  COMPETITIVE_MENTION     = 'COMPETITIVE_MENTION',     // ENTERPRISE
  FEATURE_REQUEST_CLUSTER = 'FEATURE_REQUEST_CLUSTER', // ENTERPRISE
  NPS_PROXY               = 'NPS_PROXY',               // ENTERPRISE
}

enum InsightSeverity {
  INFO      = 'INFO',
  WARNING   = 'WARNING',
  CRITICAL  = 'CRITICAL',
}

enum InsightScope {
  ALL_SOURCES   = 'ALL_SOURCES',
  SINGLE_SOURCE = 'SINGLE_SOURCE',
  SOURCE_TYPE   = 'SOURCE_TYPE',
}

enum AlertType {
  SENTIMENT_NEGATIVE_SPIKE  = 'SENTIMENT_NEGATIVE_SPIKE',  // MVP
  NEW_REVIEW_NEGATIVE       = 'NEW_REVIEW_NEGATIVE',        // MVP
  RATING_DROP               = 'RATING_DROP',                // MVP
  NEW_SOURCE_DETECTED       = 'NEW_SOURCE_DETECTED',        // MVP
  HIGH_URGENCY_FEEDBACK     = 'HIGH_URGENCY_FEEDBACK',      // POST-MVP
  VOLUME_SPIKE              = 'VOLUME_SPIKE',               // POST-MVP
  COMPETITOR_MENTION_SPIKE  = 'COMPETITOR_MENTION_SPIKE',   // ENTERPRISE
  TOPIC_EMERGING            = 'TOPIC_EMERGING',             // ENTERPRISE
}

enum AlertChannel {
  EMAIL       = 'EMAIL',          // MVP
  IN_APP      = 'IN_APP',         // MVP
  WEBHOOK     = 'WEBHOOK',        // POST-MVP
  SLACK       = 'SLACK',          // POST-MVP
  TEAMS       = 'TEAMS',          // POST-MVP
  PUSH        = 'PUSH',           // ENTERPRISE (mobile app)
  SMS         = 'SMS',            // ENTERPRISE
}

enum DeliveryStatus {
  PENDING     = 'PENDING',
  DELIVERED   = 'DELIVERED',
  FAILED      = 'FAILED',
  SUPPRESSED  = 'SUPPRESSED',   // throttled by rate limiter
}

// ─── Job Statuses ──────────────────────────────────────────────────────────

enum DiscoveryStatus {
  QUEUED      = 'QUEUED',
  RUNNING     = 'RUNNING',
  COMPLETED   = 'COMPLETED',
  FAILED      = 'FAILED',
}

enum DiscoveryTrigger {
  MANUAL          = 'MANUAL',
  PROFILE_UPDATED = 'PROFILE_UPDATED',
  SCHEDULED       = 'SCHEDULED',      // POST-MVP
}

enum CandidateStatus {
  PENDING   = 'PENDING',    // Awaiting review
  APPROVED  = 'APPROVED',   // Promoted to source
  REJECTED  = 'REJECTED',   // Confirmed not relevant
  DUPLICATE = 'DUPLICATE',  // Matches an existing source URL
}

enum IngestionStatus {
  QUEUED      = 'QUEUED',
  RUNNING     = 'RUNNING',
  COMPLETED   = 'COMPLETED',
  FAILED      = 'FAILED',
  SKIPPED     = 'SKIPPED',    // Content unchanged; nothing to process
}

enum SkippedReason {
  CONTENT_UNCHANGED = 'CONTENT_UNCHANGED',
  RATE_LIMITED      = 'RATE_LIMITED',
  SOURCE_ERROR      = 'SOURCE_ERROR',
}

enum MonitoringStatus {
  ACTIVE    = 'ACTIVE',
  PAUSED    = 'PAUSED',
  ERROR     = 'ERROR',
  DISABLED  = 'DISABLED',
}

// ─── Reports ──────────────────────────────────────────────────────────────

enum ReportType {
  WEEKLY_SUMMARY    = 'WEEKLY_SUMMARY',    // MVP
  MONTHLY_EXECUTIVE = 'MONTHLY_EXECUTIVE', // POST-MVP
  SOURCE_BREAKDOWN  = 'SOURCE_BREAKDOWN',  // POST-MVP
  TOPIC_DEEP_DIVE   = 'TOPIC_DEEP_DIVE',   // ENTERPRISE
  COMPETITOR_COMPARISON = 'COMPETITOR_COMPARISON', // ENTERPRISE
}

enum ReportStatus {
  GENERATING = 'GENERATING',
  COMPLETED  = 'COMPLETED',
  FAILED     = 'FAILED',
}

// ─── Organization ─────────────────────────────────────────────────────────

enum PlanTier {
  FREE        = 'FREE',        // MVP
  STARTER     = 'STARTER',     // MVP
  PRO         = 'PRO',         // POST-MVP
  ENTERPRISE  = 'ENTERPRISE',  // ENTERPRISE
}

enum OrgStatus {
  ACTIVE      = 'ACTIVE',
  SUSPENDED   = 'SUSPENDED',
  CANCELLED   = 'CANCELLED',
}

// ─── Embedded value types ─────────────────────────────────────────────────

interface Location {
  country: string;   // ISO 3166-1 alpha-2
  region?: string;
  city?: string;
}

interface SocialHandle {
  platform: SocialPlatform;
  handle: string;
}

enum SocialPlatform {
  INSTAGRAM   = 'INSTAGRAM',
  FACEBOOK    = 'FACEBOOK',
  TWITTER_X   = 'TWITTER_X',
  LINKEDIN    = 'LINKEDIN',
  YOUTUBE     = 'YOUTUBE',
  TIKTOK      = 'TIKTOK',
}

interface Industry {
  category: string;
  subcategory?: string;
}
```

---

## 4. State Machine Diagrams

### 4.1 Source Verification State Machine

A source moves through verification states as discovery confidence and human review determine its validity.

```
            [Discovery finds candidate]
                        │
                        ▼
               ┌────────────────┐
               │  UNVERIFIED    │  (confidence ≥ 0.80: skip to VERIFIED via auto-verify)
               └────────┬───────┘
                        │
              ─────────────────────────
              │                       │
              │ confidence 0.50–0.79   │ confidence < 0.50
              │ → queue for review     │ → auto-reject
              ▼                       ▼
    ┌──────────────────┐     ┌─────────────────┐
    │    PENDING       │     │    REJECTED      │
    │ (human review    │     │ (discarded)      │
    │  queue)          │     └─────────────────┘
    └─────────┬────────┘
              │
       ───────────────
       │             │
       │ human       │ human
       │ approves    │ rejects
       ▼             ▼
┌──────────────┐  ┌─────────────────┐
│  VERIFIED    │  │    REJECTED     │
│ (active      │  │ (blocked from   │
│  monitoring) │  │  future runs)   │
└──────────────┘  └─────────────────┘

Auto-verify path (high confidence):

UNVERIFIED ──[confidence ≥ 0.80]──► VERIFIED (verifiedBy = 'system')
```

---

### 4.2 Discovery Run Lifecycle

```
 [Trigger: MANUAL / PROFILE_UPDATED / SCHEDULED]
                     │
                     ▼
           ┌─────────────────┐
           │     QUEUED      │ ← waiting in job queue
           └────────┬────────┘
                    │ job worker picks up
                    ▼
           ┌─────────────────┐
           │     RUNNING     │ ← generating queries, fetching search results,
           │                 │   evaluating candidates
           └──────┬──────────┘
                  │
         ─────────────────────
         │                   │
         │ pipeline finishes  │ unrecoverable error
         │ successfully       │ (e.g. search API down)
         ▼                   ▼
┌──────────────────┐  ┌──────────────┐
│    COMPLETED     │  │    FAILED    │
│ candidatesFound  │  │ errorMessage │
│ stored           │  │ logged       │
└──────────────────┘  └──────────────┘

Notes:
- No automatic retry of the full run on failure (retry individual queries, not the whole run).
- Partial results from a FAILED run are still stored (candidates found before failure are preserved).
```

---

### 4.3 Ingestion Run Lifecycle

```
 [MonitoringTarget scheduler fires]
               │
               ▼
     ┌─────────────────┐
     │     QUEUED      │ ← waiting in scraping queue
     └────────┬────────┘
              │ scraping worker picks up
              ▼
     ┌─────────────────┐
     │     RUNNING     │ ← Crawl4AI fetching page
     └──────┬──────────┘
            │
   ──────────────────────────────────────────
   │                  │                     │
   │ fetch succeeds,  │ fetch succeeds,     │ error
   │ content changed  │ content unchanged   │ (retry up to 3x)
   ▼                  ▼                     ▼
┌─────────────┐  ┌──────────────┐  ┌──────────────┐
│  COMPLETED  │  │   SKIPPED    │  │    FAILED    │
│ items       │  │ reason:      │  │ errorMessage │
│ extracted,  │  │ CONTENT_     │  │ stored       │
│ queued      │  │ UNCHANGED    │  │              │
│ for AI      │  └──────────────┘  └──────────────┘
└─────────────┘

SKIPPED also occurs when:
  - Rate limit prevents the fetch (RATE_LIMITED)
  - Source is in ERROR state (SOURCE_ERROR)
```

---

### 4.4 Feedback Pipeline (Four-Layer Flow)

```
[IngestionRun completes with new content]
               │
               ▼
     ┌─────────────────────────┐
     │  Layer 1: RAW CONTENT   │
     │  rawHtml, httpStatus,   │
     │  contentHash stored     │
     └────────────┬────────────┘
                  │ extraction job runs
                  │ (parser specific to source type)
                  ▼
     ┌─────────────────────────┐
     │ Layer 2: NORMALIZED     │
     │ FEEDBACK ITEM           │
     │ authorIdentifier,       │
     │ contentText, rating,    │
     │ languageCode stored     │
     └────────────┬────────────┘
                  │ queued for AI analysis
                  ▼
     ┌─────────────────────────┐
     │ Layer 3: AI ANALYSIS    │
     │ OmniRoute processes     │
     │ item → Zod validates    │
     │ → Analysis stored       │
     └────────────┬────────────┘
                  │ nightly aggregation job
                  ▼
     ┌─────────────────────────┐
     │ Layer 4: DERIVED        │
     │ INSIGHT                 │
     │ Patterns across many    │
     │ items → Insight stored  │
     │ → AlertRules evaluated  │
     └─────────────────────────┘

Persistence at each layer:
  RAW CONTENT: Preserved indefinitely for 90 days, then moved to cold storage.
  FEEDBACK ITEM: Retained per plan limits.
  ANALYSIS: Retained with feedback item.
  INSIGHT: Retained for 5 years (regulatory / trend analysis).

Reprocessing:
  If the AI prompt changes (analysisVersion incremented), all FEEDBACK ITEMs
  with the old analysisVersion can be requeued for re-analysis without
  re-scraping — raw content is preserved.
```

---

## 5. Aggregate Boundaries

Aggregates are clusters of entities that are loaded and saved together as a unit. The aggregate root is the entity through which the aggregate is accessed. Operations on non-root entities in an aggregate always go through the root.

### 5.1 Organization Aggregate

```
┌────────────────────────────────────────┐
│ AGGREGATE: Organization                │
│ Root: Organization                     │
│                                        │
│  Organization                          │
│    └── (plan limits, billing status)   │
└────────────────────────────────────────┘
```

- **Root**: `Organization`
- **Included**: Organization attributes only
- **Not included**: CompanyProfile is a separate aggregate (it can grow large and is edited independently)
- **Rationale**: Organization is accessed frequently (auth, RLS checks). Keeping it lean avoids loading profile data on every request.

---

### 5.2 CompanyProfile Aggregate

```
┌────────────────────────────────────────┐
│ AGGREGATE: CompanyProfile              │
│ Root: CompanyProfile                   │
│                                        │
│  CompanyProfile                        │
│    ├── locations[]     (value objects) │
│    ├── aliases[]       (value objects) │
│    └── socialHandles[] (value objects) │
└────────────────────────────────────────┘
```

- **Root**: `CompanyProfile`
- **Included**: All profile fields including embedded value objects (locations, aliases, socialHandles)
- **Rationale**: The profile is edited as a whole. Locations/handles/aliases have no independent lifecycle; they only exist as part of the profile.

---

### 5.3 Source Aggregate

```
┌────────────────────────────────────────┐
│ AGGREGATE: Source                      │
│ Root: Source                           │
│                                        │
│  Source                                │
│    └── MonitoringTarget                │
└────────────────────────────────────────┘
```

- **Root**: `Source`
- **Included**: `MonitoringTarget` (always 1:1 with an active Source)
- **Rationale**: MonitoringTarget only exists because of Source. Its lifecycle is controlled by Source (create on verification, delete if source is removed). They are always loaded together.

---

### 5.4 Discovery Aggregate

```
┌────────────────────────────────────────┐
│ AGGREGATE: DiscoveryRun                │
│ Root: DiscoveryRun                     │
│                                        │
│  DiscoveryRun                          │
│    └── DiscoveryCandidate[] (children) │
└────────────────────────────────────────┘
```

- **Root**: `DiscoveryRun`
- **Included**: All `DiscoveryCandidate` records for this run
- **Not included**: Candidates may reference Sources (if promoted), but Source belongs to the Source aggregate
- **Rationale**: Candidates only exist within the context of a discovery run. They are created together, and reviewed as a batch.

---

### 5.5 Feedback Aggregate

```
┌────────────────────────────────────────┐
│ AGGREGATE: IngestionRun                │
│ Root: IngestionRun                     │
│                                        │
│  IngestionRun                          │
│    └── FeedbackItem[] (children)       │
└────────────────────────────────────────┘
```

- **Root**: `IngestionRun`
- **Included**: All `FeedbackItem` records produced by this run
- **Not included**: Analysis belongs to a separate aggregate (it is computed asynchronously and independently)
- **Rationale**: FeedbackItems are batch-created together per ingestion run. The run is the unit of retry.

---

### 5.6 Analysis Aggregate

```
┌────────────────────────────────────────┐
│ AGGREGATE: FeedbackItem + Analysis     │
│ Root: FeedbackItem                     │
│                                        │
│  FeedbackItem                          │
│    └── Analysis (1:1, optional)        │
└────────────────────────────────────────┘
```

- **Root**: `FeedbackItem`
- **Included**: The `Analysis` record (when present)
- **Rationale**: Analysis is always loaded with its FeedbackItem. They are never queried separately in the dashboard — you always want both together or neither.

---

### 5.7 Insight Aggregate

```
┌────────────────────────────────────────┐
│ AGGREGATE: AlertRule                   │
│ Root: AlertRule                        │
│                                        │
│  AlertRule                             │
│    └── Alert[] (fired instances)       │
└────────────────────────────────────────┘
```

```
┌────────────────────────────────────────┐
│ AGGREGATE: Insight                     │
│ Root: Insight (standalone)             │
│                                        │
│  Insight                               │
└────────────────────────────────────────┘
```

- Insights are standalone computed results. They are not parented to a specific FeedbackItem but reference many.
- AlertRules aggregate their own fired Alerts (which track delivery status per instance).

---

## 6. Domain Events

Domain events are significant things that happened in the domain. They are the connective tissue between aggregates and triggers for downstream processing.

```
Event                         Producer          Consumers
─────────────────────────────────────────────────────────────────────────────
ProfileCreated                CompanyProfile    → triggers initial DiscoveryRun
ProfileUpdated                CompanyProfile    → triggers new DiscoveryRun
                                                  (if material change to identity fields)

DiscoveryRunQueued            DiscoveryRun      → job queue picks up and starts run
DiscoveryRunCompleted         DiscoveryRun      → creates DiscoveryCandidates
                                                  → sends NEW_SOURCE_DETECTED alert
                                                    for high-confidence auto-verified sources
DiscoveryRunFailed            DiscoveryRun      → retry logic, engineering alert

CandidateAutoVerified         DiscoveryCandidate→ creates Source + MonitoringTarget
CandidateQueuedForReview      DiscoveryCandidate→ adds to human review queue
CandidateRejected             DiscoveryCandidate→ logged, no further action

SourceVerified                Source            → creates MonitoringTarget
                                                  → starts monitoring schedule
SourceRejected                Source            → blocked from future discovery runs
SourceDeactivated             Source            → disables MonitoringTarget

IngestionScheduled            MonitoringTarget  → job queue picks up and starts ingestion
IngestionRunCompleted         IngestionRun      → extracts FeedbackItems
                                                  → queues items for AI analysis
IngestionRunSkipped           IngestionRun      → updates lastCheckedAt, no extraction
IngestionRunFailed            IngestionRun      → retry logic, consecutive failure tracking

FeedbackItemCreated           FeedbackItem      → queued for analysis
FeedbackItemDuplicated        FeedbackItem      → marked isDuplicate; not queued for analysis

AnalysisCompleted             Analysis          → feeds into nightly Insight aggregation
AnalysisFailed                Analysis          → retained for manual retry; error stored

InsightGenerated              Insight (nightly) → evaluates all active AlertRules
                                                  → populates dashboard trends

AlertTriggered                AlertRule         → creates Alert record
                                                  → dispatches to configured channels
AlertDelivered                Alert             → updates deliveryStatus
AlertDeliveryFailed           Alert             → retry, then SUPPRESSED with error

ReportGenerated               Report            → available in dashboard
                                                  → email dispatch to org members (weekly)
```

---

## 7. Invariants

Invariants are rules that must **always hold** in the domain. They are enforced at the aggregate root level, at the application service layer, and reinforced by RLS at the database layer.

### 7.1 Tenant Isolation (Applies to Every Entity)

> **Every entity stored in the system must have a non-null `organizationId`.**

- No query may return rows across organization boundaries.
- Supabase RLS policies enforce this at the database layer for all read and write operations.
- Background job workers must explicitly receive and use `organizationId` as a filter — they must never query without it.
- This invariant cannot be overridden by any application logic, including admin endpoints.

---

### 7.2 Source Verification Integrity

> **A Source may only reach VERIFIED status via one of two defined paths:**
>
> **Path A (Auto-verify):** `DiscoveryCandidate.confidenceScore >= 0.80` → system sets `verifiedBy = 'system'`  
> **Path B (Human review):** A human user explicitly approves the candidate from the review queue.
>
> **A Source may never be VERIFIED without a `verifiedAt` timestamp and a `verifiedBy` reference.**

---

### 7.3 MonitoringTarget Creation

> **A MonitoringTarget must be created at the same time as, and only as a result of, a Source being set to VERIFIED + ACTIVE.**
>
> **A MonitoringTarget must not exist without a corresponding VERIFIED Source.**

---

### 7.4 FeedbackItem Traceability

> **Every FeedbackItem must trace to exactly one Source (via `sourceId`) and exactly one IngestionRun (via `ingestionRunId`).**
>
> FeedbackItems are never created without a valid `sourceId` and `ingestionRunId`. Orphaned FeedbackItems (where the source is deactivated) are retained but marked as inactive.

---

### 7.5 Analysis Traceability

> **Every Analysis record must trace to exactly one FeedbackItem (via `feedbackItemId`).**
>
> An Analysis is never created without a valid `feedbackItemId`. A FeedbackItem may have zero or one Analysis (zero while pending or if analysis failed).

---

### 7.6 AI Output Schema Validation

> **No Analysis record may be persisted where `validationPassed = false` AND `rawAiResponse` is not stored.**
>
> Even if the AI response fails Zod schema validation:
> - The `Analysis` record is still created (with `validationPassed = false`).
> - `rawAiResponse` is always stored (for debugging and potential re-parsing).
> - `sentiment`, `topics`, `intent` are left null on validation failure.
> - The failure is logged and surfaced in monitoring.

---

### 7.7 Author Anonymization

> **The raw display name or profile URL of any feedback author must never be persisted.**
>
> During extraction:
> 1. Capture display name/profile URL temporarily in memory.
> 2. Compute `authorIdentifier = SHA-256(sourceType + "|" + displayName + "|" + profileUrl)`.
> 3. Store `authorIdentifier` only.
> 4. Discard the raw inputs.
>
> This is enforced in the normalization layer. It cannot be bypassed by configuration.

---

### 7.8 Confidence Score Routing

> **Every DiscoveryCandidate must be routed deterministically based on its confidence score:**
>
> - `>= 0.80`: Auto-verified → Source + MonitoringTarget created immediately.
> - `0.50 – 0.79`: Added to human review queue with `status = PENDING`.
> - `< 0.50`: Auto-rejected with `status = REJECTED`. Not promoted.
>
> No candidate may remain in `PENDING` state without appearing in the human review queue.

---

### 7.9 Rate Limit Enforcement

> **No two requests may be issued to the same domain within a 10-second window, regardless of which organization owns the sources.**
>
> The rate limiter is global (shared across all tenants). One organization's aggressive polling must not starve another organization's monitoring of the same domain.

---

### 7.10 Scraping Ethics (Unconditional)

> **The following actions are forbidden at all times, with no configuration override:**
>
> 1. Fetching content behind an authentication wall (login-required pages).
> 2. Bypassing CAPTCHA or bot detection mechanisms.
> 3. Fetching URLs in the `Disallow` list of the target domain's `robots.txt`.
> 4. Fetching private messages, DMs, or non-public content.
> 5. Issuing requests to internal IP ranges (SSRF prevention): `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.0/8`, `169.254.0.0/16`.
