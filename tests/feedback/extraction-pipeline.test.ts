import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FeedbackIngestionService } from '../../src/lib/feedback/ingestion';
import { ExtractorRegistry, BaseExtractor } from '../../src/lib/scraping/extractors';
import { ExtractionResult } from '../../src/lib/scraping/types';
import { SourceType } from '../../src/types/database.types';
import { readFileSync } from 'fs';
import path from 'path';

describe('Feedback Ingestion Pipeline', () => {
  let mockSupabase: any;
  let ingestionService: FeedbackIngestionService;

  beforeEach(() => {
    ExtractorRegistry.getInstance().resetToDefaults();

    // Reset standard chainable mock for Supabase
    const dbState = {
      existingHashes: [] as { id: string; content_hash: string; external_id?: string }[],
      existingExtIds: [] as { id: string; external_id: string; content_hash: string }[],
    };

    mockSupabase = {
      _dbState: dbState,
      from: vi.fn((table: string) => {
        const query: any = {
          _table: table,
          _selectedFields: '',
          _filters: [] as { field: string; value: any }[],
          insert: vi.fn((items: any) => {
            const arr = Array.isArray(items) ? items : [items];
            return {
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: `inserted-${table}-${Date.now()}`, ...arr[0] },
                  error: null,
                }),
              })),
              error: null,
            };
          }),
          update: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })),
          select: vi.fn((fields: string) => {
            query._selectedFields = fields;
            return query;
          }),
          eq: vi.fn((field: string, value: any) => {
            query._filters.push({ field, value });
            return query;
          }),
          in: vi.fn((field: string, values: any[]) => {
            if (field === 'content_hash') {
              const matched = dbState.existingHashes.filter((h) => values.includes(h.content_hash));
              return Promise.resolve({ data: matched, error: null });
            }
            if (field === 'external_id') {
              const matched = dbState.existingExtIds.filter((e) => values.includes(e.external_id));
              return Promise.resolve({ data: matched, error: null });
            }
            return Promise.resolve({ data: [], error: null });
          }),
          single: vi.fn().mockResolvedValue({
            data: { id: `run-${Date.now()}` },
            error: null,
          }),
        };
        return query;
      }),
    };

    ingestionService = new FeedbackIngestionService(mockSupabase);
  });

  it('should detect in-batch duplicates correctly from Trustpilot fixture', async () => {
    const html = readFileSync(path.join(__dirname, '../fixtures/trustpilot.html'), 'utf-8');

    const summary = await ingestionService.ingestFromScrape({
      organizationId: 'org-1',
      sourceId: 'src-1',
      sourceUrl: 'https://trustpilot.com/review/acme.com',
      sourceType: 'trustpilot',
      rawHtml: html,
    });

    // In trustpilot.html:
    // Review 1: id=tp_rev_1001, text=Exceptional customer support...
    // Review 2: id=tp_rev_1002, text=Terrible onboarding...
    // Review 3: id=tp_rev_1003, text=Solid platform... (missing author)
    // Review 4: id=tp_rev_1001, exact duplicate of Review 1
    expect(summary.metrics.totalExtracted).toBe(4);
    expect(summary.metrics.inBatchDuplicates).toBe(1);
    expect(summary.metrics.newCount).toBe(3);
    expect(summary.persistedItemsCount).toBe(3);
  });

  it('should handle malformed pages without throwing and return 0 extracted items', async () => {
    const html = readFileSync(path.join(__dirname, '../fixtures/malformed.html'), 'utf-8');

    const summary = await ingestionService.ingestFromScrape({
      organizationId: 'org-1',
      sourceId: 'src-1',
      sourceUrl: 'https://example.com/malformed',
      sourceType: 'generic_web',
      rawHtml: html,
    });

    expect(summary.metrics.totalExtracted).toBe(0);
    expect(summary.metrics.newCount).toBe(0);
  });

  it('should correctly extract Yelp reviews with ratings and complaints', async () => {
    const html = readFileSync(path.join(__dirname, '../fixtures/yelp.html'), 'utf-8');

    const summary = await ingestionService.ingestFromScrape({
      organizationId: 'org-1',
      sourceId: 'src-yelp',
      sourceUrl: 'https://www.yelp.com/biz/acme-coffee',
      sourceType: 'yelp',
      rawHtml: html,
    });

    expect(summary.metrics.totalExtracted).toBe(2);
    expect(summary.metrics.inBatchDuplicates).toBe(0);
    expect(summary.metrics.newCount).toBe(2);
  });

  it('should extract Google Maps reviews and handle relative date parsing & missing author fallbacks', async () => {
    const html = readFileSync(path.join(__dirname, '../fixtures/google-maps.html'), 'utf-8');

    const summary = await ingestionService.ingestFromScrape({
      organizationId: 'org-1',
      sourceId: 'src-maps',
      sourceUrl: 'https://maps.google.com/maps?cid=123',
      sourceType: 'google_maps',
      rawHtml: html,
    });

    expect(summary.metrics.totalExtracted).toBe(2);
    expect(summary.metrics.newCount).toBe(2);
  });

  it('should extract Reddit post and comments as forum posts and comments', async () => {
    const html = readFileSync(path.join(__dirname, '../fixtures/reddit.html'), 'utf-8');

    const summary = await ingestionService.ingestFromScrape({
      organizationId: 'org-1',
      sourceId: 'src-reddit',
      sourceUrl: 'https://reddit.com/r/technology/comments/123/acme',
      sourceType: 'reddit',
      rawHtml: html,
    });

    expect(summary.metrics.totalExtracted).toBeGreaterThanOrEqual(1);
    expect(summary.metrics.newCount).toBeGreaterThanOrEqual(1);
  });

  it('should extract CX news/blog article text content', async () => {
    const html = readFileSync(path.join(__dirname, '../fixtures/cx-article.html'), 'utf-8');

    const summary = await ingestionService.ingestFromScrape({
      organizationId: 'org-1',
      sourceId: 'src-article',
      sourceUrl: 'https://cxinsights.example.com/acme-review',
      sourceType: 'article',
      rawHtml: html,
    });

    expect(summary.metrics.totalExtracted).toBe(1);
    expect(summary.metrics.newCount).toBe(1);
  });

  it('should handle repeated crawls idempotently by detecting existing content hashes', async () => {
    const html = readFileSync(path.join(__dirname, '../fixtures/yelp.html'), 'utf-8');

    // First crawl: extract items to find their content hashes
    const registry = ExtractorRegistry.getInstance();
    const extractor = registry.get('yelp');
    const extraction = extractor.extract(html, 'https://www.yelp.com/biz/acme-coffee');

    // Mock existing records in database with these hashes
    mockSupabase._dbState.existingHashes = extraction.items.map((item, idx) => ({
      id: `existing-db-id-${idx}`,
      content_hash: item.contentHash,
      external_id: item.externalId,
    }));

    // Run repeated crawl
    const summary = await ingestionService.ingestFromScrape({
      organizationId: 'org-1',
      sourceId: 'src-yelp',
      sourceUrl: 'https://www.yelp.com/biz/acme-coffee',
      sourceType: 'yelp',
      rawHtml: html,
    });

    expect(summary.metrics.totalExtracted).toBe(2);
    expect(summary.metrics.dbDuplicates).toBe(2);
    expect(summary.metrics.newCount).toBe(0);
    expect(summary.persistedItemsCount).toBe(0);
  });

  it('should detect and update changed/edited review content with matching external ID', async () => {
    const html = readFileSync(path.join(__dirname, '../fixtures/yelp.html'), 'utf-8');

    // Mock an older version of yelp_rev_201 with different hash in the DB
    mockSupabase._dbState.existingExtIds = [
      {
        id: 'db-yelp-rev-201',
        external_id: 'yelp_rev_201',
        content_hash: 'old_obsolete_hash_12345',
      },
    ];

    const summary = await ingestionService.ingestFromScrape({
      organizationId: 'org-1',
      sourceId: 'src-yelp',
      sourceUrl: 'https://www.yelp.com/biz/acme-coffee',
      sourceType: 'yelp',
      rawHtml: html,
    });

    // 1 updated revision (yelp_rev_201), 1 new item (yelp_rev_202)
    expect(summary.metrics.updatedCount).toBe(1);
    expect(summary.metrics.newCount).toBe(1);
    expect(summary.persistedItemsCount).toBe(2);
  });

  it('should allow dynamic hot-swapping of extractors using the Strategy Pattern', async () => {
    // Define a custom mock extractor
    class MockCustomExtractor extends BaseExtractor {
      public readonly sourceType: SourceType = 'generic_web';
      public extract(html: string, pageUrl: string): ExtractionResult {
        return {
          sourceType: 'generic_web',
          sourceUrl: pageUrl,
          items: [
            {
              externalId: 'custom-1',
              contentText: 'Custom extracted feedback message',
              rating: 5,
              authorDisplayName: 'Special Tester',
              authorIdentifier: this.anonymizeAuthor('Special Tester'),
              contentHash: this.computeContentHash('Custom extracted feedback message', 'anon'),
              feedbackType: 'review',
            },
          ],
          totalExtracted: 1,
          pageTitle: 'Custom Title',
        };
      }
    }

    const registry = ExtractorRegistry.getInstance();
    registry.register(new MockCustomExtractor());

    const summary = await ingestionService.ingestFromScrape({
      organizationId: 'org-1',
      sourceId: 'src-custom',
      sourceUrl: 'https://example.com/test',
      sourceType: 'generic_web',
      rawHtml: '<div>dummy</div>',
    });

    expect(summary.metrics.totalExtracted).toBe(1);
    expect(summary.metrics.newCount).toBe(1);
  });
});
