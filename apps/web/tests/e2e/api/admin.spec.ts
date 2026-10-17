import { test, expect } from '@playwright/test';
import { preflight, TEST_PASSWORD } from '../env';
import { registerUser, guestContext } from '../helpers/register';
import { cleanupUser, setRole, adminClient } from '../helpers/admin';

test.beforeAll(async () => {
  await preflight();
});

test.describe('Admin API — companies & jobs (ADM)', () => {
  // Track created company/job ids for cleanup.
  const createdCompanies = new Set<string>();
  const createdJobs = new Set<string>();

  test.afterEach(async () => {
    const admin = adminClient();
    for (const id of createdJobs) await admin.from('jobs').delete().eq('id', id);
    for (const id of createdCompanies) await admin.from('companies').delete().eq('id', id);
    createdJobs.clear();
    createdCompanies.clear();
  });

  test('ADM-01 guest POST /api/admin/companies → 401', async () => {
    const ctx = await guestContext();
    try {
      const res = await ctx.post('/api/admin/companies', { data: {} });
      expect(res.status()).toBe(401);
      expect((await res.json()).error).toBe('Unauthorized');
    } finally {
      await ctx.dispose();
    }
  });

  test('ADM-02 candidate POST /api/admin/companies → 403', async () => {
    const user = await registerUser();
    try {
      const res = await user.ctx.post('/api/admin/companies', { data: {} });
      expect(res.status()).toBe(403);
      expect((await res.json()).error).toBe('Forbidden');
    } finally {
      await cleanupUser(user.email);
    }
  });

  test('ADM-03 admin creates a company then a job', async () => {
    const user = await registerUser();
    try {
      await setRole(user.userId, 'admin');
      const login = await user.ctx.post('/api/auth/login', {
        data: { email: user.email, password: TEST_PASSWORD },
      });
      expect(login.status(), 'admin re-login should succeed').toBe(200);

      const coRes = await user.ctx.post('/api/admin/companies', { data: { name: 'QA Co' } });
      expect(coRes.status(), 'admin should create company').toBe(200);
      const companyId = (await coRes.json()).id as string;
      expect(companyId).toBeTruthy();
      createdCompanies.add(companyId);

      const jobRes = await user.ctx.post('/api/admin/jobs', {
        data: { company_id: companyId, title: 'QA Job', description: 'd' },
      });
      expect(jobRes.status(), 'admin should create job').toBe(200);
      const jobId = (await jobRes.json()).id as string;
      expect(jobId).toBeTruthy();
      createdJobs.add(jobId);
    } finally {
      await cleanupUser(user.email);
    }
  });
});
