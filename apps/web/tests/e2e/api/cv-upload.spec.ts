import { test, expect } from '@playwright/test';
import { preflight, isAiUp } from '../env';
import { registerUser, guestContext } from '../helpers/register';
import { cleanupUser, adminClient } from '../helpers/admin';
import { pdfUpload, makeBadFile } from '../helpers/files';

test.beforeAll(async () => {
  await preflight();
});

test.describe('CV upload — POST /api/parse-cv (CVU)', () => {
  test('CVU-01 guest upload → 401 Unauthorized', async () => {
    const ctx = await guestContext();
    try {
      const res = await ctx.post('/api/parse-cv', { multipart: { file: pdfUpload() } });
      expect(res.status()).toBe(401);
      expect((await res.json()).error).toBe('Unauthorized');
    } finally {
      await ctx.dispose();
    }
  });

  test('CVU-02 unsupported file type (.txt) → 415', async () => {
    const user = await registerUser();
    try {
      const res = await user.ctx.post('/api/parse-cv', { multipart: { file: makeBadFile() } });
      expect(res.status()).toBe(415);
      expect((await res.json()).error).toMatch(/Unsupported file type/);
    } finally {
      await cleanupUser(user.email);
    }
  });

  test('CVU-03 missing file field → 400 No file', async () => {
    const user = await registerUser();
    try {
      const res = await user.ctx.post('/api/parse-cv', { multipart: {} });
      expect(res.status()).toBe(400);
      expect((await res.json()).error).toBe('No file');
    } finally {
      await cleanupUser(user.email);
    }
  });

  test('CVU-04 valid PDF upload → 200 and object stored under userId/ path', async () => {
    test.skip(!isAiUp(), 'needs AI service');
    const user = await registerUser();
    try {
      const res = await user.ctx.post('/api/parse-cv', { multipart: { file: pdfUpload() } });
      expect(res.status(), 'valid PDF should parse').toBe(200);

      // Storage path must be scoped to the owner's userId folder.
      const { data, error } = await adminClient().storage.from('cv-uploads').list(user.userId);
      expect(error).toBeFalsy();
      expect((data ?? []).length, 'a stored object should appear under userId/').toBeGreaterThanOrEqual(1);
    } finally {
      await cleanupUser(user.email);
    }
  });
});
