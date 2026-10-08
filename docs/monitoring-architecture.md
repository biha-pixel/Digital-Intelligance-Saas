# Monitoring Architecture — Customer Experience Intelligence SaaS

**Document version**: 1.0  
**Phase**: Phase 1 — Domain Design  
**Status**: Draft  
**Author**: Architect Agent  
**Date**: 2026-10-07

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Monitoring Pipeline](#monitoring-pipeline)
3. [Scheduling and Polling](#scheduling-and-polling)
4. [Content Extraction](#content-extraction)
5. [Normalization Pipeline](#normalization-pipeline)
6. [AI Analysis Pipeline](#ai-analysis-pipeline)
7. [Insight Generation](#insight-generation)
8. [Alert Evaluation](#alert-evaluation)
9. [Report Compilation](#report-compilation)
10. [Operational Concerns](#operational-concerns)

---

## System Overview

The monitoring system continuously watches verified sources for new customer feedback. It extracts content, normalizes it into a canonical format, runs AI analysis, generates insights, evaluates alert rules, and compiles reports.

This document covers everything that happens after a Source has been verified and a MonitoringTarget has been created.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     MONITORING SYSTEM OVERVIEW                         │
│                                                                         │
│  ┌───────────┐   ┌───────────┐   ┌───────────┐   ┌──────────────┐    │
│  │ Scheduler │   │ Scraper   │   │Normalizer │   │ AI Analyzer  │    │
│  │           │──▶│ (Crawl4AI)│──▶│           │──▶│ (OmniRoute)  │    │
│  └───────────┘   └───────────┘   └───────────┘   └──────┬───────┘    │
│                                                           │            │
│                                                           ▼            │
│  ┌───────────────────────────────────────────────────────────────┐     │
│  │                   Post-Analysis Pipeline                      │     │
│  │                                                               │     │
│  │  ┌───────────┐     ┌───────────┐     ┌──────────────┐       │     │
│  │  │ Insight   │     │  Alert    │     │   Report     │       │     │
│  │  │ Generator │────▶│ Evaluator │────▶│  Builder     │       │     │
│  │  └───────────┘     └───────────┘     └──────────────┘       │     │
│  └───────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Monitoring Pipeline

### Pipeline Stages

```
Stage 1          Stage 2          Stage 3          Stage 4
SCHEDULE         SCRAPE           NORMALIZE        ANALYZE

MonitoringTarget   ScrapingJob      FeedbackItem     AnalysisResult
is due             runs             created          created
     │                │                │                │
     ▼                ▼                ▼                ▼
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│Schedule  │    │ Fetch    │    │ Parse    │    │  Send    │
│scraping  │───▶│ content  │───▶│ raw into │───▶│  to AI   │
│job       │    │ via      │    │ feedback │    │  via     │
│          │    │ Crawl4AI │    │ items    │    │OmniRoute │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
                                                     │
                                                     ▼
                     Stage 7          Stage 6          Stage 5
                     REPORT           ALERT            INSIGHT

                     Report           Alert             Insight
                     compiled         triggered         generated
                          │                │                │
                          ▼                ▼                ▼
                    ┌──────────┐    ┌──────────┐    ┌──────────┐
                    │ Compile  │    │ Evaluate │    │ Aggregate│
                    │ periodic │◄───│ alert    │◄───│ analysis │
                    │ report   │    │ rules    │    │ results  │
                    └──────────┘    └──────────┘    └──────────┘
```

### Event-Driven Processing

Each stage emits a domain event that triggers the next stage. This decouples stages and allows independent scaling and retry.

```
MonitoringTarget.nextScheduledAt reached
  → Scheduler creates ScrapingJob (QUEUED)

ScrapingJob(COMPLETED)
  → emits: ScrapingJobCompleted
  → triggers: Normalization Worker

RawContent created
  → emits: RawContentCreated
  → triggers: Normalization Worker (alternative trigger)

FeedbackItem created
  → emits: FeedbackItemCreated
  → triggers: AI Analysis Worker

AnalysisResult created
  → emits: AnalysisResultCreated
  → triggers: Insight Generator + Alert Evaluator

Insight created
  → emits: InsightCreated
  → triggers: Alert Evaluator (insight-level alerts)
```

---

## Scheduling and Polling

### Polling Strategy

Different source types need different polling frequencies. High-velocity sources (social media) may produce new content every hour, while owned websites may only change weekly.

### Default Polling Intervals

| Source Type | Default Interval | Rationale | Phase |
|-------------|-----------------|-----------|-------|
| `REVIEW_GOOGLE` | 6 hours | Reviews trickle in, moderate volume | 🟢 MVP |
| `REVIEW_TRUSTPILOT` | 6 hours | Similar to Google | 🟢 MVP |
| `REVIEW_YELP` | 12 hours | Lower velocity for most businesses | 🟡 POST-MVP |
| `SOCIAL_INSTAGRAM_OWNED` | 2 hours | Higher velocity, engagement matters | 🟢 MVP |
| `SOCIAL_FACEBOOK_OWNED` | 4 hours | Moderate velocity | 🟢 MVP |
| `SOCIAL_TWITTER_OWNED` | 1 hour | Highest velocity social | 🟡 POST-MVP |
| `SOCIAL_YOUTUBE_OWNED` | 12 hours | Comments accumulate slowly | 🟡 POST-MVP |
| `FORUM_REDDIT` | 4 hours | Active threads get comments quickly | 🟢 MVP |
| `WEBSITE_MAIN` | 24 hours | Rarely changes | 🟢 MVP |
| `NEWS_ARTICLE` | 24 hours | Published once, comment section slow | 🟡 POST-MVP |
| `BLOG_POST` | 24 hours | Similar to news | 🟡 POST-MVP |
| `PUBLIC_WEB_PAGE` | 24 hours | Default for unrecognized | 🟢 MVP |
| `EMAIL_INBOX` | 5 minutes | Near-real-time for support | 🟡 POST-MVP |
| `WHATSAPP_BUSINESS` | 5 minutes | Near-real-time for support | 🔴 ENTERPRISE |

🟢 MVP: Fixed intervals per source type. Users cannot customize.  
🟡 POST-MVP: User-configurable intervals within allowed ranges.  
🔴 ENTERPRISE: Adaptive polling based on observed content velocity.

### Scheduler Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     SCHEDULER                                │
│                                                              │
│  Runs every 60 seconds (cron or setInterval in MVP)         │
│                                                              │
│  1. Query: SELECT * FROM monitoring_targets                  │
│     WHERE is_enabled = true                                  │
│     AND next_scheduled_at <= now()                           │
│     ORDER BY next_scheduled_at ASC                           │
│     LIMIT 50                                                 │
│                                                              │
│  2. For each target:                                         │
│     ├── Check: no RUNNING or QUEUED job already exists      │
│     ├── Create ScrapingJob (status: QUEUED)                 │
│     └── Update next_scheduled_at += polling_interval        │
│                                                              │
│  3. Enqueue ScrapingJobs to job queue                       │
│                                                              │
│  Constraints:                                                │
│  - At most 1 active job per MonitoringTarget                │
│  - Global concurrency limit: 10 concurrent scraping jobs    │
│  - Per-domain concurrency limit: 1 job per domain at a time │
└─────────────────────────────────────────────────────────────┘
```

### Adaptive Polling (🔴 ENTERPRISE)

```
function computeAdaptiveInterval(target: MonitoringTarget): number {
  // Look at last N scrapes for this target
  recentJobs = getRecentScrapingJobs(target.id, count=10)

  // Count how many had new content
  changesDetected = recentJobs.filter(j => j.isContentChanged).length
  changeRate = changesDetected / recentJobs.length

  // High change rate → shorter interval (min 1 hour)
  // Low change rate → longer interval (max 48 hours)
  if changeRate >= 0.8:
    return max(1 * HOUR, target.pollingInterval * 0.5)
  elif changeRate <= 0.1:
    return min(48 * HOURS, target.pollingInterval * 2)
  else:
    return target.pollingInterval  // No change
}
```

### Change Detection

Every scraping job computes a content hash (SHA-256 of the extracted text content, excluding timestamps and dynamic elements). This hash is compared with the previous hash stored on the MonitoringTarget.

```
function detectChange(job: ScrapingJob, target: MonitoringTarget): boolean {
  newHash = sha256(job.extractedText)

  if target.lastContentHash is null:
    return true  // First fetch is always "changed"

  if newHash !== target.lastContentHash:
    return true  // Content changed

  return false  // No change, skip normalization
}
```

If content has not changed, the ScrapingJob is marked SKIPPED and no further processing occurs. This saves AI costs.

---

## Content Extraction

### Scraping via Crawl4AI

All content fetches go through the self-hosted Crawl4AI service. The scraping wrapper handles SSRF prevention, robots.txt checking, and rate limiting before delegating to Crawl4AI.

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONTENT EXTRACTION LAYER                     │
│                                                                  │
│  ScrapingJob                                                     │
│      │                                                           │
│      ▼                                                           │
│  ┌──────────────────┐                                           │
│  │  SSRF Validator  │ ← Reject private IPs, non-HTTP schemes    │
│  └────────┬─────────┘                                           │
│           │                                                      │
│           ▼                                                      │
│  ┌──────────────────┐                                           │
│  │  robots.txt      │ ← Check crawl permission, use cache      │
│  │  Checker         │                                           │
│  └────────┬─────────┘                                           │
│           │                                                      │
│           ▼                                                      │
│  ┌──────────────────┐                                           │
│  │  Rate Limiter    │ ← Per-domain token bucket                 │
│  │                  │                                           │
│  └────────┬─────────┘                                           │
│           │                                                      │
│           ▼                                                      │
│  ┌──────────────────┐     ┌──────────────────┐                  │
│  │  Crawl4AI        │     │                  │                  │
│  │  Client          │────▶│  Crawl4AI        │                  │
│  │  (HTTP API)      │     │  Docker Service  │                  │
│  │                  │◀────│                  │                  │
│  └────────┬─────────┘     └──────────────────┘                  │
│           │                                                      │
│           ▼                                                      │
│  ┌──────────────────┐                                           │
│  │  RawContent      │ ← Store raw HTML + extracted text         │
│  │  Storage         │                                           │
│  └──────────────────┘                                           │
└─────────────────────────────────────────────────────────────────┘
```

### Crawl4AI Client Interface

```typescript
interface ScrapingProvider {
  fetch(request: ScrapeRequest): Promise<ScrapeResponse>;
  healthCheck(): Promise<boolean>;
}

type ScrapeRequest = {
  url: string;
  extractText: boolean;
  screenshot: boolean;
  timeout: number;        // milliseconds
  waitForSelector: string | null;
  headers: Record<string, string>;
};

type ScrapeResponse = {
  html: string;
  text: string;
  statusCode: number;
  contentType: string;
  title: string;
  links: string[];
  fetchedAt: Date;
};
```

### Platform-Specific Extractors

Different platforms structure their content differently. Platform-specific extractors know how to pull reviews, comments, or posts from the raw HTML.

```
┌──────────────────────────────────────────────────────────────┐
│                  PLATFORM EXTRACTORS                         │
│                                                              │
│  Raw HTML / API Response                                     │
│       │                                                      │
│       ▼                                                      │
│  ┌─────────────────────┐                                    │
│  │  Extractor Router   │                                    │
│  │  (by SourceType)    │                                    │
│  └──────────┬──────────┘                                    │
│             │                                                │
│    ┌────────┼────────┬────────┬────────┬────────┐           │
│    │        │        │        │        │        │           │
│    ▼        ▼        ▼        ▼        ▼        ▼           │
│  ┌──────┐┌──────┐┌──────┐┌──────┐┌──────┐┌──────┐         │
│  │Google││Trust-││Yelp  ││Reddit││Insta-││Generic│         │
│  │Review││pilot ││      ││      ││gram  ││(text) │         │
│  │Extr. ││Extr. ││Extr. ││Extr. ││Extr. ││Extr.  │         │
│  └──────┘└──────┘└──────┘└──────┘└──────┘└──────┘         │
│    │        │        │        │        │        │           │
│    └────────┴────────┴────────┴────────┴────────┘           │
│                         │                                    │
│                         ▼                                    │
│                  FeedbackItem[]                              │
│                  (platform-agnostic)                         │
└──────────────────────────────────────────────────────────────┘
```

### Extractor Interface

```typescript
interface PlatformExtractor {
  readonly supportedSourceTypes: SourceType[];

  extract(raw: RawContent): Promise<ExtractedFeedback[]>;
  canHandle(sourceType: SourceType): boolean;
}

type ExtractedFeedback = {
  externalId: string | null;
  authorHandle: string | null;
  authorDisplayName: string | null;
  text: string;
  rating: number | null;
  ratingScale: number | null;
  publishedAt: Date | null;
  sourceUrl: string | null;
  isReply: boolean;
  parentExternalId: string | null;
  mediaUrls: string[];
  language: string;
};
```

### MVP Extractors

| Extractor | Source Types | Strategy | Phase |
|-----------|-------------|----------|-------|
| Google Reviews | `REVIEW_GOOGLE` | Parse structured data from Maps HTML | 🟢 MVP |
| Trustpilot | `REVIEW_TRUSTPILOT` | Parse review cards from HTML | 🟢 MVP |
| Reddit | `FORUM_REDDIT` | Parse comment thread HTML or use old.reddit | 🟢 MVP |
| Instagram | `SOCIAL_INSTAGRAM_OWNED` | Parse post/comment HTML (limited without API) | 🟢 MVP |
| Facebook | `SOCIAL_FACEBOOK_OWNED` | Parse page reviews HTML (limited without API) | 🟢 MVP |
| Generic | Everything else | Extract all visible text, treat as single item | 🟢 MVP |

Post-MVP, these extractors should be replaced with official API connectors where available.

---

## Normalization Pipeline

### Purpose

Normalization transforms platform-specific extracted data into the canonical `FeedbackItem` format. It is a deterministic process (no AI involved).

### Normalization Steps

```
ExtractedFeedback (platform-specific)
     │
     ├── Step 1: Text Cleaning
     │     ├── Strip HTML tags
     │     ├── Decode HTML entities
     │     ├── Normalize whitespace
     │     ├── Remove invisible characters
     │     └── Truncate to max length (10,000 chars)
     │
     ├── Step 2: Language Detection
     │     ├── Use compact language detection library
     │     ├── Default to 'en' if uncertain
     │     └── Store ISO 639-1 code
     │
     ├── Step 3: Deduplication Check
     │     ├── Check (tenantId, sourceId, externalId) uniqueness
     │     ├── If duplicate: mark isDuplicate = true, link to original
     │     └── If new: continue normally
     │
     ├── Step 4: Rating Normalization
     │     ├── Normalize all ratings to their native scale
     │     ├── Store both rating and ratingScale
     │     └── e.g., 4 out of 5 → rating=4.0, ratingScale=5
     │
     ├── Step 5: Timestamp Normalization
     │     ├── Parse platform-specific date formats
     │     ├── Convert to UTC
     │     └── Handle "2 days ago" relative timestamps
     │
     └── Step 6: Output
           └── FeedbackItem record created
               └── emits: FeedbackItemCreated
```

### Text Cleaning Rules

```typescript
function cleanText(raw: string): string {
  let text = raw;

  // Remove HTML tags
  text = text.replace(/<[^>]*>/g, ' ');

  // Decode HTML entities
  text = decodeHtmlEntities(text);

  // Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim();

  // Remove zero-width characters
  text = text.replace(/[​-‍﻿]/g, '');

  // Truncate to max length
  if (text.length > 10_000) {
    text = text.substring(0, 10_000) + '...';
  }

  return text;
}
```

### Normalization Worker

```
function processNormalization(rawContent: RawContent): void {
  source = getSource(rawContent.sourceId)
  extractor = getExtractor(source.sourceType)

  extracted = extractor.extract(rawContent)

  for each item in extracted:
    // Skip empty text
    if item.text.trim().length < 3:
      continue

    // Clean and normalize
    cleanedText = cleanText(item.text)
    language = detectLanguage(cleanedText)

    // Dedup check
    existing = findByExternalId(rawContent.tenantId, source.id, item.externalId)
    if existing:
      // Update if content changed
      if existing.text !== cleanedText:
        updateFeedbackItem(existing.id, { text: cleanedText, updatedAt: now() })
        // Re-analysis triggered on content change
      continue

    // Create FeedbackItem
    feedbackItem = createFeedbackItem({
      tenantId: rawContent.tenantId,
      rawContentId: rawContent.id,
      sourceId: source.id,
      monitoringTargetId: source.monitoringTarget.id,
      externalId: item.externalId,
      authorHandle: item.authorHandle,
      authorDisplayName: item.authorDisplayName,
      text: cleanedText,
      rating: item.rating,
      ratingScale: item.ratingScale,
      publishedAt: item.publishedAt,
      language: language,
      platform: source.sourceType,
      sourceUrl: item.sourceUrl,
      isReply: item.isReply,
      parentExternalId: item.parentExternalId,
      normalizedAt: now(),
    })

    emit(FeedbackItemCreated, feedbackItem)

  rawContent.isProcessed = true
}
```

---

## AI Analysis Pipeline

### Overview

The AI analysis pipeline sends each new FeedbackItem to OmniRoute for structured analysis. All AI outputs are validated against a Zod schema before storage.

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI ANALYSIS PIPELINE                         │
│                                                                  │
│  FeedbackItemCreated event                                       │
│       │                                                          │
│       ▼                                                          │
│  ┌──────────────────┐                                           │
│  │  Analysis Queue  │  ← Batches items for efficiency           │
│  │  (FIFO)          │                                           │
│  └────────┬─────────┘                                           │
│           │                                                      │
│           ▼                                                      │
│  ┌──────────────────┐     ┌──────────────────┐                  │
│  │  Prompt Builder  │     │                  │                  │
│  │                  │────▶│     OmniRoute    │                  │
│  │  - System prompt │     │     AI Gateway   │                  │
│  │  - User prompt   │     │                  │                  │
│  │  - Schema spec   │     │     (NOT         │                  │
│  │                  │◀────│     OpenRouter)  │                  │
│  └────────┬─────────┘     └──────────────────┘                  │
│           │                                                      │
│           ▼                                                      │
│  ┌──────────────────┐                                           │
│  │  Schema          │  ← Zod schema validation                  │
│  │  Validator       │                                           │
│  └────────┬─────────┘                                           │
│           │                                                      │
│      ┌────┴─────┐                                               │
│      │          │                                                │
│   Passes     Fails                                              │
│      │          │                                                │
│      ▼          ▼                                                │
│  ┌────────┐  ┌────────────┐                                     │
│  │ Store  │  │ Log error, │                                     │
│  │Result │  │ store with  │                                     │
│  │        │  │ validation  │                                     │
│  │        │  │ errors      │                                     │
│  └────────┘  └────────────┘                                     │
└─────────────────────────────────────────────────────────────────┘
```

### Prompt Design

```
System Prompt:
  You are a customer experience analyst. Analyze the following customer
  feedback and extract structured insights. Respond ONLY with valid JSON
  matching the provided schema. Do not include any text outside the JSON.

User Prompt:
  Analyze this customer feedback:

  Source: {platform} ({sourceType})
  Language: {language}
  Rating: {rating}/{ratingScale} (if available)
  Date: {publishedAt}

  Feedback text:
  ---
  {text}
  ---

  Respond with a JSON object containing:
  - sentiment: one of "POSITIVE", "NEUTRAL", "NEGATIVE", "MIXED"
  - sentimentScore: number from -1.0 to 1.0
  - sentimentConfidence: number from 0.0 to 1.0
  - topics: array of topic strings (max 5)
  - topicConfidences: array of confidence scores matching topics
  - intent: one of "COMPLAINT", "PRAISE", "QUESTION", "SUGGESTION", "NEUTRAL", "REPORT"
  - intentConfidence: number from 0.0 to 1.0
  - summary: 1-2 sentence summary of the feedback
  - keyPhrases: array of key phrases (max 10)
```

### Schema Validation

```typescript
import { z } from 'zod';

const AnalysisOutputSchema = z.object({
  sentiment: z.enum(['POSITIVE', 'NEUTRAL', 'NEGATIVE', 'MIXED']),
  sentimentScore: z.number().min(-1).max(1),
  sentimentConfidence: z.number().min(0).max(1),
  topics: z.array(z.string()).max(5),
  topicConfidences: z.array(z.number().min(0).max(1)).max(5),
  intent: z.enum([
    'COMPLAINT', 'PRAISE', 'QUESTION',
    'SUGGESTION', 'NEUTRAL', 'REPORT',
  ]),
  intentConfidence: z.number().min(0).max(1),
  summary: z.string().min(1).max(500),
  keyPhrases: z.array(z.string()).max(10),
});

// Post-MVP additions
const ExtendedAnalysisOutputSchema = AnalysisOutputSchema.extend({
  urgency: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  urgencyReason: z.string().max(200).nullable().optional(),
  entities: z.array(z.object({
    text: z.string(),
    type: z.enum([
      'PRODUCT', 'FEATURE', 'PERSON',
      'PLACE', 'ISSUE', 'COMPETITOR', 'OTHER',
    ]),
    confidence: z.number().min(0).max(1),
  })).max(20).optional(),
});
```

### OmniRoute Client Interface

```typescript
interface AIProvider {
  analyze(request: AnalysisRequest): Promise<AnalysisResponse>;
  estimateCost(request: AnalysisRequest): CostEstimate;
  getAvailableModels(): Promise<ModelInfo[]>;
}

type AnalysisRequest = {
  systemPrompt: string;
  userPrompt: string;
  maxTokens: number;
  temperature: number;
  responseFormat: 'json';
};

type AnalysisResponse = {
  content: string;           // Raw JSON string from model
  modelId: string;
  modelVersion: string;
  promptTokens: number;
  completionTokens: number;
  finishReason: string;
};
```

### Analysis Worker

```
function processAnalysis(feedbackItem: FeedbackItem): void {
  // Build prompts
  systemPrompt = buildSystemPrompt()
  userPrompt = buildUserPrompt(feedbackItem)

  // Call OmniRoute
  try:
    response = aiProvider.analyze({
      systemPrompt,
      userPrompt,
      maxTokens: 500,
      temperature: 0.1,   // Low temperature for consistent structured output
      responseFormat: 'json',
    })
  catch (error):
    // Retry with backoff (max 3 attempts)
    if retryable(error):
      scheduleRetry(feedbackItem.id, attempt + 1)
      return
    else:
      // Store failed analysis
      createAnalysisResult({
        feedbackItemId: feedbackItem.id,
        validationPassed: false,
        validationErrors: [error.message],
        ...
      })
      return

  // Parse and validate AI output
  parsed = JSON.parse(response.content)
  validation = AnalysisOutputSchema.safeParse(parsed)

  if validation.success:
    createAnalysisResult({
      feedbackItemId: feedbackItem.id,
      tenantId: feedbackItem.tenantId,
      modelId: response.modelId,
      modelVersion: response.modelVersion,
      analysisVersion: CURRENT_ANALYSIS_VERSION,
      sentiment: validation.data.sentiment,
      sentimentScore: validation.data.sentimentScore,
      sentimentConfidence: validation.data.sentimentConfidence,
      topics: validation.data.topics,
      topicConfidences: validation.data.topicConfidences,
      intent: validation.data.intent,
      intentConfidence: validation.data.intentConfidence,
      summary: validation.data.summary,
      keyPhrases: validation.data.keyPhrases,
      promptTokens: response.promptTokens,
      completionTokens: response.completionTokens,
      rawAiResponse: response,
      validationPassed: true,
      validationErrors: [],
      analyzedAt: now(),
    })

    emit(AnalysisResultCreated, analysisResult)

  else:
    // Store with validation errors for debugging
    createAnalysisResult({
      feedbackItemId: feedbackItem.id,
      validationPassed: false,
      validationErrors: validation.error.issues.map(i => i.message),
      rawAiResponse: response,
      ...defaults for other fields
    })
```

### Batching Strategy

To reduce costs, the system can batch multiple short feedback items into a single AI call.

🟡 POST-MVP: Batch up to 5 short feedback items (under 200 chars each) into a single prompt, asking the model to analyze each with numbered outputs.

🔴 ENTERPRISE: Dynamic batching based on token budget optimization.

### Re-Analysis

When the analysis prompt or schema version changes, existing FeedbackItems can be re-analyzed.

```
function reanalyze(tenantId: UUID, analysisVersion: string): void {
  // Find all analysis results with older version
  outdated = query(
    SELECT feedback_item_id FROM analysis_results
    WHERE tenant_id = tenantId
    AND analysis_version < analysisVersion
  )

  for each feedbackItemId in outdated:
    scheduleAnalysis(feedbackItemId, priority=LOW)
}
```

🟡 POST-MVP: Manual re-analysis trigger.  
🔴 ENTERPRISE: Automatic re-analysis when new model version deployed.

### Cost Tracking

Every AI call records token usage. This is aggregated per tenant for billing and budgeting.

```
┌──────────────────────────────────────────────────┐
│                 COST TRACKING                     │
│                                                   │
│  Per AnalysisResult:                              │
│    promptTokens + completionTokens               │
│                                                   │
│  Daily aggregate per tenant:                      │
│    totalPromptTokens                              │
│    totalCompletionTokens                          │
│    estimatedCostUSD                               │
│                                                   │
│  Budget limits (🟡 POST-MVP):                     │
│    Monthly token budget per billing tier          │
│    Alert at 80% of budget                         │
│    Hard cap at 100% of budget                     │
└──────────────────────────────────────────────────┘
```

---

## Insight Generation

### Overview

The insight generator runs periodically (every hour) and also on-demand after new AnalysisResults are created. It aggregates individual analysis results into higher-level patterns.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    INSIGHT GENERATION                                │
│                                                                     │
│  Trigger: Periodic (hourly) or batch of AnalysisResults            │
│                                                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────┐ │
│  │  Time       │    │  Topic      │    │  Rating                │ │
│  │  Series     │    │  Aggregator │    │  Aggregator            │ │
│  │  Analyzer   │    │             │    │                        │ │
│  │             │    │  Count by   │    │  Compute mean          │ │
│  │  Sentiment  │    │  topic over │    │  rating per source     │ │
│  │  over time  │    │  time       │    │  over time             │ │
│  └──────┬──────┘    └──────┬──────┘    └──────────┬─────────────┘ │
│         │                  │                       │               │
│         ▼                  ▼                       ▼               │
│  ┌─────────────────────────────────────────────────────────┐      │
│  │                    Pattern Detector                      │      │
│  │                                                         │      │
│  │  - Significant trend? (sentiment changing direction)    │      │
│  │  - Spike? (topic volume > 2x normal)                   │      │
│  │  - Rating shift? (mean rating changed > 0.5 stars)     │      │
│  │  - Volume anomaly? (feedback count > 2x normal)        │      │
│  └────────────────────────┬────────────────────────────────┘      │
│                           │                                        │
│                    Only if pattern                                  │
│                    is significant                                   │
│                           │                                        │
│                           ▼                                        │
│                    ┌─────────────┐                                  │
│                    │  Insight    │                                  │
│                    │  Created   │                                  │
│                    └─────────────┘                                  │
└─────────────────────────────────────────────────────────────────────┘
```

### Insight Generators

#### Sentiment Trend (🟢 MVP)

```
function detectSentimentTrend(
  tenantId: UUID,
  companyProfileId: UUID,
  windowDays: number = 7
): Insight | null {
  current = avgSentimentScore(tenantId, companyProfileId, last windowDays days)
  previous = avgSentimentScore(tenantId, companyProfileId, previous windowDays days)

  if previous is null or current is null:
    return null

  delta = current - previous

  // Only create insight if shift is significant (> 0.15 on -1 to 1 scale)
  if abs(delta) < 0.15:
    return null

  direction = delta > 0 ? "improving" : "declining"
  severity = abs(delta) > 0.30 ? CRITICAL :
             abs(delta) > 0.20 ? WARNING : INFO

  return createInsight({
    tenantId,
    companyProfileId,
    insightType: SENTIMENT_TREND,
    title: `Sentiment ${direction} by ${abs(delta).toFixed(2)}`,
    description: `Average sentiment score moved from ${previous.toFixed(2)} to ${current.toFixed(2)} over the past ${windowDays} days.`,
    severity,
    windowStart: now() - windowDays * DAY,
    windowEnd: now(),
    metricBefore: previous,
    metricAfter: current,
    metricDelta: delta,
    feedbackCount: totalItems,
    feedbackItemIds: contributingItemIds,
  })
}
```

#### Topic Spike (🟢 MVP)

```
function detectTopicSpike(
  tenantId: UUID,
  companyProfileId: UUID,
  windowHours: number = 24
): Insight[] {
  insights = []

  // Count topic occurrences in current window vs baseline
  currentTopics = topicCounts(tenantId, companyProfileId, last windowHours hours)
  baselineTopics = topicCounts(tenantId, companyProfileId, previous 7 * 24 hours)
  baselineNormalized = normalize(baselineTopics, to: windowHours)

  for each (topic, currentCount) in currentTopics:
    baselineCount = baselineNormalized[topic] or 0

    if baselineCount == 0 and currentCount >= 3:
      // New topic appearing with sufficient volume
      insights.push(createInsight({
        insightType: TOPIC_SPIKE,
        title: `New topic detected: "${topic}"`,
        description: `"${topic}" appeared ${currentCount} times in the last ` +
          `${windowHours} hours with no prior baseline.`,
        severity: WARNING,
        topic: topic,
        metricBefore: 0,
        metricAfter: currentCount,
        ...
      }))
    elif baselineCount > 0 and currentCount > baselineCount * 2:
      // Existing topic spiking
      insights.push(createInsight({
        insightType: TOPIC_SPIKE,
        title: `Topic spike: "${topic}" (${currentCount} mentions)`,
        description: `"${topic}" is ${(currentCount/baselineCount).toFixed(1)}x ` +
          `above baseline.`,
        severity: currentCount > baselineCount * 5 ? CRITICAL : WARNING,
        ...
      }))

  return insights
}
```

#### Rating Change (🟢 MVP)

```
function detectRatingChange(
  tenantId: UUID,
  sourceId: UUID,
  windowDays: number = 30
): Insight | null {
  currentRating = avgRating(tenantId, sourceId, last windowDays days)
  previousRating = avgRating(tenantId, sourceId, previous windowDays days)

  if previousRating is null or currentRating is null:
    return null

  delta = currentRating - previousRating

  // Only create insight if shift is >= 0.5 stars
  if abs(delta) < 0.5:
    return null

  direction = delta > 0 ? "improved" : "dropped"

  return createInsight({
    insightType: RATING_CHANGE,
    title: `Rating ${direction} on ${source.displayName}`,
    description: `Average rating moved from ${previousRating.toFixed(1)} to ` +
      `${currentRating.toFixed(1)} (delta: ${delta > 0 ? '+' : ''}${delta.toFixed(1)}).`,
    severity: delta < -1.0 ? CRITICAL : delta < 0 ? WARNING : INFO,
    sourceId: sourceId,
    ...
  })
}
```

#### Volume Anomaly (🟡 POST-MVP)

```
function detectVolumeAnomaly(
  tenantId: UUID,
  companyProfileId: UUID,
  windowHours: number = 24
): Insight | null {
  currentVolume = feedbackCount(tenantId, companyProfileId, last windowHours hours)
  baselineVolume = avgFeedbackCount(tenantId, companyProfileId,
                     per windowHours hours, over last 30 days)

  if baselineVolume < 5:
    return null  // Not enough baseline data

  ratio = currentVolume / baselineVolume

  if ratio < 2.0:
    return null

  return createInsight({
    insightType: VOLUME_ANOMALY,
    title: `Feedback volume spike: ${ratio.toFixed(1)}x normal`,
    ...
  })
}
```

### Insight Deduplication

The same pattern may be detected across consecutive runs of the generator. To avoid flooding the user with duplicate insights:

1. Before creating an insight, check if one with the same `(insightType, sourceId, topic, severity)` exists within the overlap window.
2. If it does: update the existing insight's `windowEnd`, `metricAfter`, and `feedbackCount`.
3. If it does not: create a new insight.

---

## Alert Evaluation

### Overview

The alert evaluator runs after insights are created and after individual AnalysisResults are created. It checks each AlertRule against the current state.

```
┌─────────────────────────────────────────────────────────────────┐
│                    ALERT EVALUATION                              │
│                                                                  │
│  Trigger: InsightCreated or AnalysisResultCreated               │
│                                                                  │
│  ┌──────────────────────────────────────────────────┐           │
│  │  Load AlertRules for this tenant                  │           │
│  │  WHERE is_enabled = true                          │           │
│  └────────────────────┬─────────────────────────────┘           │
│                       │                                          │
│         For each AlertRule:                                      │
│                       │                                          │
│  ┌────────────────────▼─────────────────────────────┐           │
│  │  1. Check cooldown                                │           │
│  │     └── If lastTriggeredAt + cooldownMinutes > now│           │
│  │         → Skip (rule is in cooldown)              │           │
│  │                                                   │           │
│  │  2. Evaluate rule condition                       │           │
│  │     └── Does the trigger match this rule type?   │           │
│  │         Does the threshold or condition apply?    │           │
│  │                                                   │           │
│  │  3. If condition met:                             │           │
│  │     ├── Create Alert record                       │           │
│  │     ├── Update rule.lastTriggeredAt               │           │
│  │     └── Dispatch to delivery channels             │           │
│  └──────────────────────────────────────────────────┘           │
│                                                                  │
│  ┌──────────────────────────────────────────────────┐           │
│  │               Alert Delivery                      │           │
│  │                                                   │           │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │           │
│  │  │  In-App  │  │  Email   │  │  Slack       │   │           │
│  │  │  Notif.  │  │  Digest  │  │  Webhook     │   │           │
│  │  │  🟢 MVP  │  │  🟢 MVP  │  │  🟡 POST-MVP│   │           │
│  │  └──────────┘  └──────────┘  └──────────────┘   │           │
│  └──────────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────┘
```

### Alert Rule Evaluation Logic

```
function evaluateAlertRule(
  rule: AlertRule,
  trigger: InsightCreated | AnalysisResultCreated
): Alert | null {

  // Check cooldown
  if rule.lastTriggeredAt and
     rule.lastTriggeredAt + rule.cooldownMinutes * MINUTE > now():
    return null

  // Check source scope
  if rule.sourceId and trigger.sourceId !== rule.sourceId:
    return null
  if rule.sourceType and trigger.sourceType !== rule.sourceType:
    return null

  // Evaluate by alert type
  switch rule.alertType:

    case NEW_REVIEW_NEGATIVE:
      if trigger is AnalysisResultCreated:
        result = trigger.analysisResult
        if result.sentiment === 'NEGATIVE' and
           result.feedbackItem.rating and
           result.feedbackItem.rating < 3:
          return createAlert(rule, trigger)
      return null

    case SENTIMENT_NEGATIVE_SPIKE:
      if trigger is InsightCreated:
        insight = trigger.insight
        if insight.insightType === 'SENTIMENT_TREND' and
           insight.metricDelta < -(rule.threshold or 0.15):
          return createAlert(rule, trigger)
      return null

    case RATING_DROP:
      if trigger is InsightCreated:
        insight = trigger.insight
        if insight.insightType === 'RATING_CHANGE' and
           insight.metricDelta < -(rule.threshold or 0.5):
          return createAlert(rule, trigger)
      return null

    case NEW_SOURCE_DETECTED:
      // Triggered by DiscoveryRunCompleted, not analysis
      // Handled separately
      return null

    case VOLUME_SPIKE:
      if trigger is InsightCreated:
        insight = trigger.insight
        if insight.insightType === 'VOLUME_ANOMALY':
          return createAlert(rule, trigger)
      return null

    default:
      return null
}
```

### Alert Delivery

```typescript
interface AlertDeliveryChannel {
  readonly channelType: string;
  deliver(alert: Alert, config: Record<string, unknown>): Promise<DeliveryResult>;
}

type DeliveryResult = {
  success: boolean;
  channelType: string;
  deliveredAt: Date | null;
  errorMessage: string | null;
};
```

MVP Delivery Channels:

| Channel | Implementation | Phase |
|---------|---------------|-------|
| In-App | Direct database insert into notification table | 🟢 MVP |
| Email | Via email provider connector (Resend/SendGrid) | 🟢 MVP |
| Slack Webhook | HTTP POST to Slack incoming webhook URL | 🟡 POST-MVP |
| MS Teams Webhook | HTTP POST to Teams connector URL | 🟡 POST-MVP |
| Custom Webhook | Signed HTTP POST to user-configured URL | 🔴 ENTERPRISE |
| SMS | Via Twilio connector | 🔴 ENTERPRISE |

### Default Alert Rules

When a new tenant creates their first CompanyProfile, the system creates sensible default alert rules:

| Default Rule | Alert Type | Threshold | Cooldown |
|-------------|-----------|-----------|----------|
| Negative review alert | NEW_REVIEW_NEGATIVE | rating < 3 | 0 min (every one) |
| Sentiment decline | SENTIMENT_NEGATIVE_SPIKE | delta < -0.20 | 24 hours |
| Rating drop | RATING_DROP | delta < -0.5 | 7 days |
| New source found | NEW_SOURCE_DETECTED | any | 0 min |

🟢 MVP: System creates default rules; user can modify them.

---

## Report Compilation

### Overview

Reports aggregate insights and analysis results into periodic summaries. They provide a high-level view of customer experience trends.

🟡 POST-MVP: Automated report generation.  
🟢 MVP: Dashboard serves as the "live report" — no generated report documents.

### Report Types

| Report Type | Period | Content | Phase |
|-------------|--------|---------|-------|
| Weekly Summary | 7 days | Sentiment trend, top topics, rating summary, alert count | 🟡 POST-MVP |
| Monthly Executive | 30 days | KPIs, month-over-month comparisons, key insights | 🟡 POST-MVP |
| Source Breakdown | Configurable | Per-source performance metrics | 🟡 POST-MVP |
| Topic Deep-Dive | Configurable | Full analysis of a single topic across all sources | 🔴 ENTERPRISE |
| Competitor Comparison | Configurable | Side-by-side metrics (requires competitor tracking) | 🔴 ENTERPRISE |
| Custom Branded | Configurable | White-label PDF with tenant branding | 🔴 ENTERPRISE |

### Report Structure (Weekly Summary)

```
┌─────────────────────────────────────────────────────┐
│                WEEKLY SUMMARY REPORT                 │
│                                                      │
│  Period: Oct 1 – Oct 7, 2026                         │
│  Company: Acme Corporation                           │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │  OVERVIEW                                      │  │
│  │  Total feedback items:      142                │  │
│  │  New sources discovered:      2                │  │
│  │  Avg sentiment score:       0.32 (+0.05)       │  │
│  │  Avg rating:               4.1/5 (unchanged)   │  │
│  │  Alerts triggered:           3                 │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │  SENTIMENT TREND                               │  │
│  │  ▴ 0.32                                        │  │
│  │  ─────────────────────────                     │  │
│  │  Mon Tue Wed Thu Fri Sat Sun                    │  │
│  │  0.28 0.30 0.35 0.40 0.25 0.30 0.35            │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │  TOP TOPICS                                    │  │
│  │  1. Customer Service (34 mentions, +12%)       │  │
│  │  2. Delivery Speed (28 mentions, +25%)         │  │
│  │  3. Product Quality (22 mentions, -5%)         │  │
│  │  4. Pricing (18 mentions, unchanged)           │  │
│  │  5. Website/App (12 mentions, NEW)             │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │  KEY INSIGHTS                                  │  │
│  │  - Delivery speed complaints spiked on Wed     │  │
│  │  - "Website/App" is a newly emerging topic     │  │
│  │  - Google Reviews rating stable at 4.2         │  │
│  │  - Trustpilot rating dropped from 4.0 to 3.8  │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │  SOURCE BREAKDOWN                              │  │
│  │  Google Reviews:     45 items, avg 4.2/5       │  │
│  │  Trustpilot:         38 items, avg 3.8/5       │  │
│  │  Instagram:          30 items, sentiment 0.45  │  │
│  │  Reddit:             18 items, sentiment -0.10 │  │
│  │  Other:              11 items                  │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │  ALERTS SUMMARY                                │  │
│  │  - Oct 3: Trustpilot rating drop (3.8)         │  │
│  │  - Oct 5: Delivery speed topic spike           │  │
│  │  - Oct 6: Negative review on Google (1 star)   │  │
│  └────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Report Generation Pipeline

```
┌──────────────────────────────────────────────────────────┐
│                REPORT GENERATION                          │
│                                                           │
│  Trigger: Scheduled (weekly/monthly) or on-demand        │
│                                                           │
│  1. Create Report record (status: GENERATING)            │
│                                                           │
│  2. Query data for period:                               │
│     ├── FeedbackItems in window                          │
│     ├── AnalysisResults for those items                  │
│     ├── Insights in window                               │
│     ├── Alerts in window                                 │
│     └── Source-level aggregates                          │
│                                                           │
│  3. Compute aggregations:                                │
│     ├── Total volume + delta from previous period        │
│     ├── Average sentiment + delta                        │
│     ├── Average rating per source + delta                │
│     ├── Topic frequency + delta                          │
│     └── Per-source breakdown                             │
│                                                           │
│  4. Compile into structured JSON (contentJson)           │
│                                                           │
│  5. Update Report (status: READY)                        │
│                                                           │
│  6. Optionally render to PDF (🔴 ENTERPRISE)             │
│                                                           │
│  7. Deliver via configured channel                       │
│     ├── Email with inline HTML (🟡 POST-MVP)            │
│     └── Dashboard viewable (🟡 POST-MVP)                │
└──────────────────────────────────────────────────────────┘
```

---

## Operational Concerns

### Job Queue Architecture

MVP uses a simple database-backed job queue. All background work (scraping, normalization, analysis, insight generation) is processed as jobs.

```
┌─────────────────────────────────────────────────────────────────┐
│                 JOB QUEUE (DATABASE-BACKED)                     │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    job_queue table                         │  │
│  │                                                           │  │
│  │  id | type      | payload    | status  | attempts | ...   │  │
│  │  ── │ ───────── │ ────────── │ ─────── │ ──────── │       │  │
│  │  1  │ SCRAPE    │ {targetId} │ QUEUED  │ 0        │       │  │
│  │  2  │ NORMALIZE │ {rawId}    │ RUNNING │ 1        │       │  │
│  │  3  │ ANALYZE   │ {itemId}   │ QUEUED  │ 0        │       │  │
│  │  4  │ INSIGHT   │ {tenantId} │ QUEUED  │ 0        │       │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Worker Process:                                                 │
│    1. SELECT ... WHERE status = 'QUEUED' ORDER BY created_at    │
│       LIMIT 1 FOR UPDATE SKIP LOCKED                            │
│    2. UPDATE status = 'RUNNING'                                  │
│    3. Process job                                                │
│    4. UPDATE status = 'COMPLETED' or 'FAILED'                   │
│    5. If FAILED and attempts < max_attempts:                     │
│       UPDATE status = 'QUEUED', attempts += 1,                   │
│       scheduled_at = now() + backoff(attempts)                   │
│                                                                  │
│  Concurrency: Single worker process in MVP                      │
│  Future: Multiple workers with FOR UPDATE SKIP LOCKED            │
└─────────────────────────────────────────────────────────────────┘
```

🟢 MVP: Database job queue with single worker process.  
🟡 POST-MVP: Multiple worker processes with `FOR UPDATE SKIP LOCKED`.  
🔴 ENTERPRISE: Dedicated job queue service (BullMQ, Inngest, or similar).

### Retry and Backoff Strategy

| Job Type | Max Attempts | Backoff Schedule | Phase |
|----------|-------------|-----------------|-------|
| Scraping | 3 | 30s, 2min, 10min | 🟢 MVP |
| Normalization | 3 | 10s, 30s, 2min | 🟢 MVP |
| AI Analysis | 3 | 10s, 1min, 5min | 🟢 MVP |
| Insight Generation | 2 | 30s, 5min | 🟢 MVP |
| Alert Delivery | 3 | 10s, 1min, 5min | 🟢 MVP |
| Report Generation | 2 | 1min, 10min | 🟡 POST-MVP |

### Concurrency Limits

| Dimension | Limit | Phase |
|-----------|-------|-------|
| Global scraping concurrency | 10 concurrent jobs | 🟢 MVP |
| Per-domain scraping concurrency | 1 concurrent job | 🟢 MVP |
| Per-tenant scraping concurrency | 5 concurrent jobs | 🟢 MVP |
| AI analysis concurrency | 5 concurrent jobs | 🟢 MVP |
| Per-tenant AI concurrency | 3 concurrent jobs | 🟢 MVP |

### Health Monitoring

```
┌─────────────────────────────────────────────────────────────────┐
│                    HEALTH CHECKS                                 │
│                                                                  │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐       │
│  │  Crawl4AI     │  │  OmniRoute    │  │  Database     │       │
│  │  Health       │  │  Health       │  │  Health       │       │
│  │               │  │               │  │               │       │
│  │  GET /health  │  │  API ping     │  │  SELECT 1     │       │
│  │  every 60s    │  │  every 60s    │  │  every 30s    │       │
│  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘       │
│          │                  │                   │               │
│          └──────────────────┴───────────────────┘               │
│                             │                                    │
│                             ▼                                    │
│          ┌──────────────────────────────────────┐               │
│          │  Health Dashboard / Logs              │               │
│          │                                      │               │
│          │  Last check: 2026-10-07 14:32:00     │               │
│          │  Crawl4AI:   HEALTHY                 │               │
│          │  OmniRoute:  HEALTHY                 │               │
│          │  Database:   HEALTHY                 │               │
│          │  Queue depth: 12 jobs                │               │
│          │  Failed jobs (24h): 3                │               │
│          └──────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────────┘
```

🟢 MVP: Health check endpoint, structured logging.  
🟡 POST-MVP: Sentry error tracking, queue depth alerting.  
🔴 ENTERPRISE: Full observability (OpenTelemetry, dashboards).

### Data Retention

| Data Type | Retention | Phase |
|-----------|----------|-------|
| RawContent (HTML) | 90 days in database, then archive to object storage | 🟢 MVP (90-day delete in MVP) |
| FeedbackItem | Indefinite | 🟢 MVP |
| AnalysisResult | Indefinite | 🟢 MVP |
| Insight | Indefinite | 🟢 MVP |
| Alert | 365 days | 🟢 MVP |
| ScrapingJob | 30 days | 🟢 MVP |
| DiscoveryCandidate | 90 days for DISCARDED; indefinite for registered | 🟢 MVP |
| Report | Indefinite | 🟡 POST-MVP |

### Complete System Integration Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    COMPLETE MONITORING SYSTEM                               │
│                                                                             │
│                                                                             │
│  ┌──────────────┐         ┌──────────────┐         ┌──────────────┐        │
│  │   Scheduler  │────────▶│  Job Queue   │────────▶│   Scraping   │        │
│  │   (cron)     │         │  (database)  │         │   Worker     │        │
│  └──────────────┘         └──────────────┘         └──────┬───────┘        │
│                                                            │                │
│                                                     ┌──────▼───────┐       │
│                                                     │   Crawl4AI   │       │
│                                                     │   (Docker)   │       │
│                                                     └──────┬───────┘       │
│                                                            │                │
│                                                     ┌──────▼───────┐       │
│                                                     │  RawContent  │       │
│                                                     │  (database)  │       │
│                                                     └──────┬───────┘       │
│                                                            │                │
│                                                     ┌──────▼───────┐       │
│                                                     │ Normalization│       │
│                                                     │   Worker     │       │
│                                                     └──────┬───────┘       │
│                                                            │                │
│                                                     ┌──────▼───────┐       │
│                                                     │ FeedbackItem │       │
│                                                     │  (database)  │       │
│                                                     └──────┬───────┘       │
│                                                            │                │
│                                                     ┌──────▼───────┐       │
│                                                     │  AI Analysis │       │
│                                                     │   Worker     │       │
│                                                     └──────┬───────┘       │
│                                                            │                │
│                                              ┌─────────────▼─────────┐     │
│                                              │      OmniRoute       │     │
│                                              │      AI Gateway      │     │
│                                              └─────────────┬─────────┘     │
│                                                            │                │
│                                                     ┌──────▼───────┐       │
│                                                     │ AnalysisResult│      │
│                                                     │  (database)  │       │
│                                                     └──────┬───────┘       │
│                                                            │                │
│                                              ┌─────────────┴──────────┐    │
│                                              │                        │    │
│                                       ┌──────▼───────┐       ┌───────▼──┐ │
│                                       │   Insight    │       │  Alert   │ │
│                                       │   Generator  │──────▶│ Evaluator│ │
│                                       └──────┬───────┘       └────┬─────┘ │
│                                              │                     │       │
│                                       ┌──────▼───────┐       ┌────▼─────┐ │
│                                       │   Insight    │       │  Alert   │ │
│                                       │  (database)  │       │ Delivery │ │
│                                       └──────────────┘       └──────────┘ │
│                                                                             │
│  LEGEND:                                                                    │
│  ──────▶  Synchronous flow                                                 │
│  Worker   Background process consuming from job queue                       │
│                                                                             │
│  MVP Workers: Single Node.js process running all workers sequentially      │
│  Post-MVP: Separate worker processes per stage                              │
│  Enterprise: Autoscaled worker pools per stage                              │
└─────────────────────────────────────────────────────────────────────────────┘
```
