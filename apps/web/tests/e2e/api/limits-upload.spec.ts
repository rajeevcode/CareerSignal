import { test, expect } from '@playwright/test';
import { preflight, isAiUp } from '../env';
import { registerUser } from '../helpers/register';
import { cleanupUser, setPlan, seedCvUploads, countRows } from '../helpers/admin';
import { pdfUpload } from '../helpers/files';
import { expectPaywall } from '../helpers/assertions';

test.beforeAll(async () => {
  await preflight();
});

// parse-cv forwards to the AI service (:8011) on success, so the 200 path needs AI.
// The quota gate runs BEFORE the file is read, so the 4th-upload 402 does NOT need AI.
test.describe('Upload limit — free plan = 3 CV uploads (LIM-UP)', () => {
  test('LIM-UP-01 free user 4th upload → 402 upload_cv (gate precedes AI)', async () => {
    const user = await registerUser();
    try {
      // Fast-forward to the quota edge: 3 existing uploads = at the cap.
      await seedCvUploads(user.candidateId, 3);
      const res = await user.ctx.post('/api/parse-cv', { multipart: { file: pdfUpload() } });
      await expectPaywall(res, 'upload_cv');
    } finally {
      await cleanupUser(user.email);
    }
  });

  test('LIM-UP-02 free user uploads succeed under quota then 4th is blocked', async () => {
    test.skip(!isAiUp(), 'needs AI service');
    const user = await registerUser();
    try {
      for (let i = 1; i <= 3; i++) {
        const res = await user.ctx.post('/api/parse-cv', { multipart: { file: pdfUpload(`cv-${i}.pdf`) } });
        expect(res.status(), `upload #${i} under quota should succeed`).toBe(200);
      }
      const fourth = await user.ctx.post('/api/parse-cv', { multipart: { file: pdfUpload('cv-4.pdf') } });
      await expectPaywall(fourth, 'upload_cv');
      expect(await countRows('cv_uploads', user.candidateId)).toBe(3);
    } finally {
      await cleanupUser(user.email);
    }
  });

  // @race — documents the check-then-write TOCTOU window in the upload limiter.
  // Invariant: regardless of races, the persisted row count must never exceed the cap (3).
  // The upload cap is enforced atomically by a BEFORE INSERT trigger on
  // cv_uploads (migration 20260619000002), so concurrent uploads can never
  // exceed the cap even though the app-level gate is check-then-write.
  test('LIM-UP-03 @race concurrent uploads never exceed the cap', async () => {
    test.skip(!isAiUp(), 'needs AI service');
    const user = await registerUser();
    try {
      // 2 seeded + 5 concurrent attempts → at most 1 should be admitted under the cap of 3.
      await seedCvUploads(user.candidateId, 2);
      const results = await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          user.ctx.post('/api/parse-cv', { multipart: { file: pdfUpload(`race-${i}.pdf`) } }),
        ),
      );
      const statuses = results.map((r) => r.status());
      const count402 = statuses.filter((s) => s === 402).length;

      // Hard invariant: never persist more than the cap, even with a check-then-write race.
      expect(
        await countRows('cv_uploads', user.candidateId),
        'cv_uploads must never exceed the free cap of 3',
      ).toBeLessThanOrEqual(3);
      // At least 2 of the 5 must be rejected (only 1 slot remained under the cap).
      expect(count402, `expected ≥2 paywalls, got statuses ${statuses.join(',')}`).toBeGreaterThanOrEqual(2);
    } finally {
      await cleanupUser(user.email);
    }
  });

  test('LIM-UP-04 pro plan bypasses the upload cap', async () => {
    test.skip(!isAiUp(), 'needs AI service');
    const user = await registerUser();
    try {
      await setPlan(user.userId, 'pro');
      await seedCvUploads(user.candidateId, 10); // well past the free cap
      const res = await user.ctx.post('/api/parse-cv', { multipart: { file: pdfUpload('pro.pdf') } });
      expect(res.status(), 'pro should not be paywalled on upload').not.toBe(402);
    } finally {
      await cleanupUser(user.email);
    }
  });
});
