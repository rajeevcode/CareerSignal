import { test, expect } from '@playwright/test';
import { preflight } from '../env';
import { registerUser, guestContext } from '../helpers/register';
import { cleanupUser } from '../helpers/admin';

test.beforeAll(async () => {
  await preflight();
});

test.describe('Access control (P0)', () => {
  // Guest (no auth) hitting protected APIs must get 401 {error:'Unauthorized'}.
  const guestRoutes: Array<{ id: string; method: 'POST' | 'GET'; path: string }> = [
    { id: 'AC-01', method: 'POST', path: '/api/match-jd' },
    { id: 'AC-02', method: 'POST', path: '/api/save-job' },
    { id: 'AC-03', method: 'POST', path: '/api/parse-cv' },
    { id: 'AC-04', method: 'POST', path: '/api/cover-letter' },
    { id: 'AC-05', method: 'POST', path: '/api/career-coach' },
    { id: 'AC-06', method: 'POST', path: '/api/apply' },
    { id: 'AC-07', method: 'POST', path: '/api/interview' },
    { id: 'AC-08', method: 'POST', path: '/api/export-cv' },
    { id: 'AC-09', method: 'POST', path: '/api/rewrite-bullet' },
    { id: 'AC-10', method: 'POST', path: '/api/interview-prep' },
    { id: 'AC-11', method: 'GET', path: '/api/cv-builder' },
  ];

  for (const r of guestRoutes) {
    test(`${r.id} guest ${r.method} ${r.path} → 401 Unauthorized`, async () => {
      const ctx = await guestContext();
      try {
        const res =
          r.method === 'GET' ? await ctx.get(r.path) : await ctx.post(r.path, { data: {} });
        expect(res.status(), `${r.path} should reject guests`).toBe(401);
        expect((await res.json()).error).toBe('Unauthorized');
      } finally {
        await ctx.dispose();
      }
    });
  }

  // A free candidate hitting admin/recruiter APIs must get 403 {error:'Forbidden'}.
  const forbiddenRoutes: Array<{ id: string; path: string }> = [
    { id: 'AC-20', path: '/api/admin/jobs' },
    { id: 'AC-21', path: '/api/admin/companies' },
    { id: 'AC-22', path: '/api/recruiter/jobs' },
  ];

  for (const r of forbiddenRoutes) {
    test(`${r.id} candidate POST ${r.path} → 403 Forbidden`, async () => {
      const user = await registerUser();
      try {
        const res = await user.ctx.post(r.path, { data: {} });
        expect(res.status(), `${r.path} should forbid candidates`).toBe(403);
        expect((await res.json()).error).toBe('Forbidden');
      } finally {
        await cleanupUser(user.email);
      }
    });
  }
});
