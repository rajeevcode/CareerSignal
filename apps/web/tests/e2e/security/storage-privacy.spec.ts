import { test, expect } from '@playwright/test';
import { preflight, isAiUp, SUPA_URL } from '../env';
import { registerUser } from '../helpers/register';
import { restAsUser } from '../helpers/rest';
import { adminClient, cleanupUser } from '../helpers/admin';
import { pdfUpload } from '../helpers/files';

test.beforeAll(async () => {
  await preflight();
});

/** CV files live in a PRIVATE bucket; only signed URLs (or the owner) can read. */
test.describe('Security: CV storage privacy (P0)', () => {
  test('STO-01..03 private bucket: public URL blocked, signed URL works, cross-user denied', async () => {
    test.skip(!isAiUp(), 'parse-cv requires the AI service to store a real object');
    const a = await registerUser();
    const b = await registerUser();
    try {
      const up = await a.ctx.post('/api/parse-cv', { multipart: { file: pdfUpload('cv.pdf') } });
      expect(up.status()).toBe(200);

      const admin = adminClient();
      const { data: files } = await admin.storage.from('cv-uploads').list(a.userId);
      expect(files?.length).toBeGreaterThanOrEqual(1);
      const objectPath = `${a.userId}/${files![0].name}`;

      // STO-01: public object URL on a private bucket is blocked.
      const pub = await fetch(`${SUPA_URL}/storage/v1/object/public/cv-uploads/${objectPath}`);
      expect([400, 403, 404]).toContain(pub.status);

      // STO-02: a service-role signed URL works.
      const { data: signed } = await admin.storage.from('cv-uploads').createSignedUrl(objectPath, 60);
      expect(signed?.signedUrl).toBeTruthy();
      const ok = await fetch(signed!.signedUrl);
      expect(ok.status).toBe(200);

      // STO-03: another user cannot sign a URL for A's object.
      const asB = restAsUser(b.accessToken);
      const { data: bSigned, error } = await asB.storage.from('cv-uploads').createSignedUrl(objectPath, 60);
      expect(bSigned?.signedUrl ?? null).toBeNull();
      expect(error).toBeTruthy();
    } finally {
      await cleanupUser(a.email);
      await cleanupUser(b.email);
    }
  });
});
