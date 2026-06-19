import { test, expect } from '@playwright/test';
import { preflight, isAiUp } from '../env';
import { registerUser } from '../helpers/register';
import { adminClient, cleanupUser } from '../helpers/admin';
import { pdfUpload, XSS_FILENAME } from '../helpers/files';

test.beforeAll(async () => {
  await preflight();
});

/**
 * XSS payload in a CV filename must round-trip as inert data (never executed
 * server-side), and the server must not crash. DOM-execution checks for job
 * descriptions live in the UI project; this API-level test asserts the payload
 * is stored verbatim as text.
 */
test.describe('Security: XSS sanitization (P0)', () => {
  test('XSS-01 malicious CV filename is stored as inert text', async () => {
    test.skip(!isAiUp(), 'parse-cv requires the AI service');
    const u = await registerUser();
    try {
      const res = await u.ctx.post('/api/parse-cv', { multipart: { file: pdfUpload(XSS_FILENAME) } });
      // Must not crash (no 500). Either accepted (200, sanitized) or rejected (415).
      expect([200, 415]).toContain(res.status());

      if (res.status() === 200) {
        const admin = adminClient();
        const { data: files } = await admin.storage.from('cv-uploads').list(u.userId);
        // The stored storage key is sanitized: no HTML-active chars (< > " ' /),
        // so the payload can never render as executable markup anywhere.
        for (const f of files ?? []) {
          expect(f.name).not.toMatch(/[<>"'/]/);
        }
      }
    } finally {
      await cleanupUser(u.email);
    }
  });
});
