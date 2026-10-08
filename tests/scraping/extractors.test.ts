import { expect, test, describe } from 'vitest';
import { GenericWebExtractor } from '../../src/lib/scraping/extractors/generic-website';
import { TrustpilotExtractor } from '../../src/lib/scraping/extractors/trustpilot';

describe('Extractors', () => {
  describe('GenericWebExtractor', () => {
    test('extracts basic content properly', () => {
      const html = `
        <html>
          <body>
            <main>
              <p>This is a customer experience intelligence SaaS that monitors brand feedback across platforms.</p>
            </main>
          </body>
        </html>
      `;
      const extractor = new GenericWebExtractor();
      const result = extractor.extract(html, 'https://example.com');

      expect(result.sourceType).toBe('generic_web');
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items[0].contentText).toContain('customer experience intelligence');
    });
  });

  describe('TrustpilotExtractor', () => {
    test('zero-PII pseudonymization matches SHA-256 standard and excludes raw author names', () => {
      const extractor = new TrustpilotExtractor();
      const authorHash = extractor.anonymizeAuthor("John Doe", "https://trustpilot.com/users/123");

      expect(authorHash).toHaveLength(64);
      expect(authorHash).not.toContain("John Doe");
    });
  });
});
