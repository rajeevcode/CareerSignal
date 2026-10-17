import { test, expect } from '@playwright/test';
import postgres from 'postgres';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { registerUser } from '../e2e/helpers/register';
import {
  adminClient,
  cleanupUser,
  seedPrimaryCv,
  setPlan,
  currentMonth,
  seededJobIds,
} from '../e2e/helpers/admin';
import { restAsUser } from '../e2e/helpers/rest';
import { BASE_URL, SUPA_URL } from '../e2e/env';

let runtimeErrors: string[] = [];
test.beforeEach(async ({ page }) => {
  runtimeErrors = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
});
test.afterEach(() =>
  expect(runtimeErrors, 'Browser runtime errors').toEqual([]),
);

function requireLocal() {
  for (const endpoint of [BASE_URL, SUPA_URL])
    if (!['localhost', '127.0.0.1'].includes(new URL(endpoint).hostname))
      throw new Error('Local-only test');
}
const posting = {
  url: 'https://jobs.example.com/positions/42?utm_source=test',
  title: 'Accessible Product Engineer',
  company: 'Private Capture Fixture',
  description:
    'Build accessible React applications and lead product experiments.',
  country: 'Portugal',
};

test('capture, deduplication, immutable submission, contacts, verified stories and reviewed integration', async ({
  page,
  context,
}, info) => {
  requireLocal();
  const user = await registerUser();
  const admin = adminClient();
  try {
    await setPlan(user.userId, 'pro');
    await seedPrimaryCv(user.candidateId);
    await admin
      .from('candidate_profiles')
      .update({ onboarding_complete: true, cv_score: null })
      .eq('id', user.candidateId);
    await context.addCookies((await user.ctx.storageState()).cookies);
    const encoded = Buffer.from(JSON.stringify(posting), 'utf8').toString(
      'base64',
    );
    await page.goto('/career#capture=' + encodeURIComponent(encoded));
    await expect(page.getByLabel('Source URL')).toHaveValue(posting.url);
    const captured = page.waitForResponse(
      (r) => r.url().endsWith('/api/career') && r.request().method() === 'POST',
    );
    await page
      .getByRole('button', { name: 'Save captured job', exact: true })
      .click();
    const result = await (await captured).json();
    expect(result.duplicate).toBe(false);
    const applicationId = result.applicationId as string;
    await expect(
      page.getByRole('link', { name: 'Open application workspace' }),
    ).toHaveCount(1);
    await page
      .getByRole('button', { name: 'Save captured job', exact: true })
      .click();
    await expect(
      page.getByRole('status').filter({ hasText: 'already captured' }),
    ).toBeVisible();
    const { data: captures } = await admin
      .from('captured_jobs')
      .select('job_id')
      .eq('candidate_id', user.candidateId);
    expect(captures).toHaveLength(1);
    await page
      .getByRole('link', { name: 'Open application workspace' })
      .click();
    await page.getByLabel('Application stage').selectOption('applied');
    await expect(page.getByText('Captured ', { exact: false })).toBeVisible();
    await page.getByText('Submitted job description', { exact: true }).click();
    await expect(
      page.getByText(posting.description, { exact: true }),
    ).toBeVisible();
    const { data: snapshot } = await admin
      .from('application_snapshots')
      .select('*')
      .eq('application_id', applicationId)
      .single();
    expect(snapshot?.cv_json?.kind).toBe('upload');
    expect(snapshot?.country).toBe('Portugal');
    expect(
      (
        await admin
          .from('application_snapshots')
          .update({ country: 'Changed' })
          .eq('application_id', applicationId)
      ).error,
    ).toBeTruthy();
    expect(
      (
        await admin
          .from('application_events')
          .update({ to_status: 'offer' })
          .eq('application_id', applicationId)
      ).error,
    ).toBeTruthy();
    await admin
      .from('jobs')
      .update({ description: 'New job description after submission' })
      .eq('id', captures![0].job_id);
    await page.reload();
    await page.getByText('Submitted job description', { exact: true }).click();
    await expect(
      page.getByText(posting.description, { exact: true }),
    ).toBeVisible();
    await page.goto('/career?tab=network');
    await page.getByLabel('name', { exact: true }).fill('Fixture Recruiter');
    await page
      .getByLabel('email', { exact: true })
      .fill('recruiter@example.test');
    await page.getByLabel('company', { exact: true }).fill('Fixture company');
    await page.getByLabel('Next contact date (UTC)').fill('2026-01-01');
    await page
      .getByRole('button', { name: 'Save contact', exact: true })
      .click();
    await expect(
      page.getByText('Fixture Recruiter', { exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'stories', exact: true }).click();
    await page
      .getByLabel('Title', { exact: true })
      .fill('Led a team and grew revenue');
    await page
      .getByLabel('Exact source excerpt')
      .fill('An invented achievement that is not in my CV.');
    for (const [label, value] of [
      ['situation', 'A growing team'],
      ['task', 'Improve outcomes'],
      ['Action', 'Led a team of five'],
      ['result', 'Increased revenue by 30%'],
    ])
      await page.getByLabel(label, { exact: true }).fill(value);
    await page.getByLabel('I checked this story').check();
    await page.getByRole('button', { name: 'Save verified story' }).click();
    await expect(
      page.getByRole('alert').filter({ hasText: 'quote at least 20' }),
    ).toBeVisible();
    await page
      .getByLabel('Exact source excerpt')
      .fill('Led a team of 5 engineers and increased revenue by 30%');
    await page.getByRole('button', { name: 'Save verified story' }).click();
    await expect(
      page.getByRole('heading', {
        name: 'Led a team and grew revenue',
        exact: true,
      }),
    ).toBeVisible();
    const historyInsert = await admin.from('jd_analyses').insert([
      {
        candidate_id: user.candidateId,
        jd_text: 'Fixture job',
        job_title: 'History fixture',
        interview_signal: 60,
        gap_json: {
          evidence: {
            job_fingerprint: 'job-fixture',
            cv_fingerprint: 'cv-1',
            scoring_version: 'heuristic-fit-v2',
          },
        },
        created_at: '2026-01-01T00:00:00Z',
      },
      {
        candidate_id: user.candidateId,
        jd_text: 'Fixture job',
        job_title: 'History fixture',
        interview_signal: 75,
        gap_json: {
          evidence: {
            job_fingerprint: 'job-fixture',
            cv_fingerprint: 'cv-2',
            scoring_version: 'heuristic-fit-v2',
          },
        },
        created_at: '2026-01-02T00:00:00Z',
      },
    ]);
    expect(historyInsert.error).toBeNull();
    await page.goto('/career?tab=history');
    await expect(
      page.getByText('Change since previous analysis of this job:', {
        exact: false,
      }),
    ).toContainText('15 points');
    await page.getByRole('button', { name: 'insights', exact: true }).click();
    await expect(
      page.getByRole('rowheader', { name: 'Portugal', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText('Insufficient data', { exact: false }),
    ).toHaveCount(3);
    await page.screenshot({
      path: info.outputPath('all-phase-insights.png'),
      fullPage: true,
    });
    const { data: connection, error: connectionError } = await admin
      .from('career_connections')
      .insert({
        candidate_id: user.candidateId,
        kind: 'calendar',
        token_ciphertext: 'invalid-fixture-no-live-credential',
        scopes: 'fixture-read-only',
      })
      .select('id')
      .single();
    expect(connectionError).toBeNull();
    const imported = await admin.from('career_integration_items').insert({
      candidate_id: user.candidateId,
      connection_id: connection!.id,
      external_id: 'fixture-event',
      kind: 'calendar',
      title: 'Interview with Fixture',
      starts_at: new Date(Date.now() + 86400000).toISOString(),
      proposed_status: 'interview',
    });
    expect(imported.error).toBeNull();
    const ownRest = restAsUser(user.accessToken);
    expect(
      (await ownRest.from('career_connections').select('*')).error,
    ).toBeTruthy();
    await page.goto('/career?tab=connections');
    await page.getByRole('combobox').selectOption(applicationId);
    await page
      .getByRole('button', { name: 'Approve stage suggestion' })
      .click();
    await expect(
      page.getByRole('heading', {
        name: 'Interview with Fixture',
        exact: true,
      }),
    ).toHaveCount(0);
    const { data: updated } = await admin
      .from('applications')
      .select('status')
      .eq('id', applicationId)
      .single();
    expect(updated?.status).toBe('interview');
    await page.goto('/dashboard');
    await expect(
      page.getByText('Recorded calendar event:', { exact: false }),
    ).toHaveCount(1);
    await page.goto('/career?tab=connections');
    const other = await registerUser();
    try {
      expect(
        (await other.ctx.get(`/applications/${applicationId}`)).status(),
      ).toBe(404);
      await setPlan(other.userId, 'pro');
      for (const [endpoint, data] of [
        ['/api/save-job', { job_id: captures![0].job_id }],
        [
          '/api/analyze-gap',
          { candidate_id: other.candidateId, job_id: captures![0].job_id },
        ],
        ['/api/cover-letter', { job_id: captures![0].job_id }],
        ['/api/interview-prep', { job_id: captures![0].job_id }],
        [
          '/api/rewrite-bullet',
          {
            job_id: captures![0].job_id,
            bullet: 'Built a source-backed product.',
          },
        ],
      ] as const) {
        expect(
          (await other.ctx.post(endpoint, { data })).status(),
          endpoint,
        ).toBe(404);
      }
      const forgedSave = await admin.from('saved_jobs').insert({
        candidate_id: other.candidateId,
        job_id: captures![0].job_id,
      });
      expect(forgedSave.error).toBeNull();
      expect(await (await other.ctx.get('/saved')).text()).not.toContain(
        posting.title,
      );
      const foreign = restAsUser(other.accessToken);
      const writeTime = new Date().toISOString();
      const attack = await foreign.from('applications').insert({
        candidate_id: other.candidateId,
        job_id: captures![0].job_id,
        status: 'applied',
        applied_at: writeTime,
        updated_at: writeTime,
      });
      expect(attack.error).toBeTruthy();
      const allowed = await foreign.from('applications').insert({
        candidate_id: other.candidateId,
        job_id: (await seededJobIds())[0],
        status: 'applied',
        applied_at: writeTime,
        updated_at: writeTime,
      });
      expect(allowed.error).toBeNull();

      expect(
        (
          await foreign
            .from('captured_jobs')
            .select('*')
            .eq('candidate_id', user.candidateId)
        ).data,
      ).toEqual([]);
      expect(
        (await foreign.from('jobs').select('id').eq('id', captures![0].job_id))
          .data,
      ).toEqual([]);
    } finally {
      await cleanupUser(other.email);
      await other.ctx.dispose();
    }
    await page
      .getByRole('button', { name: 'Disconnect and delete imports' })
      .click();
    await expect(page.getByRole('button', { name: 'Sync now' })).toHaveCount(0);
    await page.goto('/interview-prep');
    await expect(
      page.getByRole('heading', {
        name: 'Led a team and grew revenue',
        exact: true,
      }),
    ).toBeVisible();
    await page.goto('/dashboard');
    await expect(
      page.getByRole('link', { name: 'Contact Fixture Recruiter' }),
    ).toBeVisible();
    await expect(
      page.getByText('Recorded calendar event:', { exact: false }),
    ).toHaveCount(0); // Disconnect deleted the imported event.
  } finally {
    await cleanupUser(user.email);
    await user.ctx.dispose();
  }
});

test('durable reminder delivery and crashed-request refunds are idempotent', async () => {
  requireLocal();
  const user = await registerUser();
  const admin = adminClient();
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (
    !dbUrl ||
    new URL(dbUrl).hostname !== '127.0.0.1' ||
    new URL(dbUrl).port !== '54322'
  )
    throw new Error('Local database required');
  const sql = postgres(dbUrl, { max: 1, prepare: false });
  try {
    const capture = await user.ctx.post('/api/career', {
      data: { action: 'capture', ...posting },
    });
    expect(capture.status()).toBe(200);
    const { applicationId } = await capture.json();
    await admin
      .from('applications')
      .update({ status: 'applied', follow_up_due_at: '2026-01-01T00:00:00Z' })
      .eq('id', applicationId);
    await admin
      .from('usage_limits')
      .update({ jd_match_count_monthly: 1, current_month: currentMonth() })
      .eq('user_id', user.userId);
    await admin.from('jd_requests').insert({
      candidate_id: user.candidateId,
      user_id: user.userId,
      request_key: 'crash-fixture',
      body_hash: 'fixture',
      status: 'processing',
      reserved_month: currentMonth(),
      lease_expires_at: '2026-01-01T00:00:00Z',
    });
    await sql`SELECT public.run_career_maintenance(${user.candidateId}::uuid)`;
    await sql`SELECT public.run_career_maintenance(${user.candidateId}::uuid)`;
    const { data: notifications } = await admin
      .from('career_notifications')
      .select('id')
      .eq('candidate_id', user.candidateId);
    expect(notifications).toHaveLength(1);
    const { data: request } = await admin
      .from('jd_requests')
      .select('status')
      .eq('user_id', user.userId)
      .single();
    expect(request?.status).toBe('failed');
    const { data: usage } = await admin
      .from('usage_limits')
      .select('jd_match_count_monthly')
      .eq('user_id', user.userId)
      .single();
    expect(usage?.jd_match_count_monthly).toBe(0);
  } finally {
    await sql.end();
    await cleanupUser(user.email);
    await user.ctx.dispose();
  }
});

test('real web and AI endpoints preserve idempotency, quota and submission choices without a paid provider', async ({
  page,
  context,
}, info) => {
  requireLocal();
  const user = await registerUser();
  const admin = adminClient();
  let companyId: string | undefined;
  try {
    await seedPrimaryCv(user.candidateId);
    await admin
      .from('candidate_profiles')
      .update({ onboarding_complete: true, cv_score: null })
      .eq('id', user.candidateId);
    const body = {
      jd_text: 'Python engineer building SQL services and analytics systems.',
      job_title: 'Python Engineer',
    };
    const responses = await Promise.all(
      Array.from({ length: 6 }, () =>
        user.ctx.post('/api/match-jd', {
          data: body,
          headers: { 'Idempotency-Key': 'all-phase-analysis' },
        }),
      ),
    );
    expect(
      responses.every((response) => [200, 202].includes(response.status())),
    ).toBe(true);
    const replay = await user.ctx.post('/api/match-jd', {
      data: body,
      headers: { 'Idempotency-Key': 'all-phase-analysis' },
    });
    expect(replay.status()).toBe(200);
    const analysis = await replay.json();
    expect(typeof analysis.interview_signal).toBe('number');
    expect(analysis.evidence.cv_text_available).toBe(true);
    expect(analysis.evidence.scoring_version).toBe('heuristic-fit-v2');
    const { data: usage } = await admin
      .from('usage_limits')
      .select('jd_match_count_monthly')
      .eq('user_id', user.userId)
      .single();
    expect(usage?.jd_match_count_monthly).toBe(1);
    const { data: analyses } = await admin
      .from('jd_analyses')
      .select('id')
      .eq('candidate_id', user.candidateId);
    expect(analyses).toHaveLength(1);
    const conflict = await user.ctx.post('/api/match-jd', {
      data: { ...body, jd_text: 'Different job' },
      headers: { 'Idempotency-Key': 'all-phase-analysis' },
    });
    expect(conflict.status()).toBe(409);
    await context.addCookies((await user.ctx.storageState()).cookies);
    await page.goto('/jd-match-tool');
    await page.getByLabel('Job title', { exact: true }).fill(body.job_title);
    await page
      .getByLabel('Job description', { exact: true })
      .fill(body.jd_text);
    await page.getByRole('button', { name: 'Get JD Match Score' }).click();
    await expect(
      page.getByRole('heading', { name: 'Source evidence', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Rewrite suggestions unavailable' }),
    ).toBeVisible();
    await expect(
      page.getByText('Upload your CV first for accurate matching.', {
        exact: false,
      }),
    ).toHaveCount(0);
    await expect(
      page
        .getByText('Python, SQL, AI, Product Management', { exact: true })
        .first(),
    ).toBeVisible();
    await page.screenshot({
      path: info.outputPath('source-evidence-report.png'),
      fullPage: true,
    });
    const now = new Date().toISOString();
    const { data: company, error: companyError } = await admin
      .from('companies')
      .insert({ name: 'Public API test fixture', created_at: now })
      .select('id')
      .single();
    expect(companyError).toBeNull();
    companyId = company!.id;
    const { data: job, error: jobError } = await admin
      .from('jobs')
      .insert({
        company_id: companyId,
        title: 'API submission fixture',
        description: 'Build services',
        status: 'published',
        posted_at: now,
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .single();
    expect(jobError).toBeNull();
    const { data: version, error: versionError } = await admin
      .from('cv_versions')
      .insert({
        candidate_id: user.candidateId,
        name: 'Submitted builder version',
        content_json: { summary: 'Source-backed fixture CV' },
        is_primary: true,
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .single();
    expect(versionError).toBeNull();
    const savedAt = '2026-01-01T00:00:00Z';
    const draft = await admin.from('applications').insert({
      candidate_id: user.candidateId,
      job_id: job!.id,
      status: 'saved',
      applied_at: savedAt,
      updated_at: savedAt,
    });
    expect(draft.error).toBeNull();
    const submitStarted = Date.now();
    const applied = await Promise.all(
      Array.from({ length: 3 }, () =>
        user.ctx.post('/api/apply', {
          data: { job_id: job!.id, cv_version_id: version!.id },
        }),
      ),
    );
    expect(applied.every((response) => response.status() === 200)).toBe(true);
    const results = await Promise.all(
      applied.map((response) => response.json()),
    );
    expect(results.filter((result) => result.is_new)).toHaveLength(1);
    const { data: application } = await admin
      .from('applications')
      .select('id,applied_at')
      .eq('candidate_id', user.candidateId)
      .eq('job_id', job!.id)
      .single();
    expect(Date.parse(application!.applied_at)).toBeGreaterThanOrEqual(
      submitStarted,
    );
    const { data: submittedJob } = await admin
      .from('jobs')
      .select('applicant_count')
      .eq('id', job!.id)
      .single();
    expect(submittedJob?.applicant_count).toBe(1);
    const { data: snapshot } = await admin
      .from('application_snapshots')
      .select('cv_json,scoring_version')
      .eq('application_id', application!.id)
      .single();
    expect(snapshot?.cv_json.kind).toBe('builder');
    expect(snapshot?.cv_json.id).toBe(version!.id);
    expect(snapshot?.scoring_version).toBe('unknown');
    await admin
      .from('applications')
      .update({ status: 'offer' })
      .eq('id', application!.id);
    expect(
      (
        await user.ctx.post('/api/apply', { data: { job_id: job!.id } })
      ).status(),
    ).toBe(200);
    const { data: afterRetry } = await admin
      .from('applications')
      .select('status')
      .eq('id', application!.id)
      .single();
    expect(afterRetry?.status).toBe('offer');
    await admin
      .from('candidate_profiles')
      .update({ cv_score: 70 })
      .eq('id', user.candidateId);
    await page.goto('/dashboard');
    const { data: versionedMatches } = await admin
      .from('match_scores')
      .select('scoring_version')
      .eq('candidate_id', user.candidateId)
      .limit(1);
    expect(versionedMatches?.[0]?.scoring_version).toBe('heuristic-fit-v2');
    const { data: unchangedSnapshot } = await admin
      .from('application_snapshots')
      .select('scoring_version')
      .eq('application_id', application!.id)
      .single();
    expect(unchangedSnapshot?.scoring_version).toBe('unknown');
  } finally {
    await cleanupUser(user.email);
    await user.ctx.dispose();
    if (companyId) await admin.from('companies').delete().eq('id', companyId);
  }
});

test('browser capture popup transfers Unicode source text for review without submitting', async ({
  page,
}) => {
  const extension = resolve(__dirname, '../../../../extensions/job-capture');
  const metadata = {
    '@type': 'JobPosting',
    title: 'Engenheiro Sénior',
    hiringOrganization: { name: 'Fixture Org' },
    description: '<p>Build <strong>accessible</strong> React products.</p>',
  };
  const html = readFileSync(resolve(extension, 'popup.html'), 'utf8')
    .replace('<script src="popup.js"></script>', '')
    .replace(
      '</body>',
      `<script type="application/ld+json">${JSON.stringify(metadata)}</script></body>`,
    );
  await page.route('https://jobs.example.com/fixture', (route) =>
    route.fulfill({ contentType: 'text/html', body: html }),
  );
  await page.goto('https://jobs.example.com/fixture');
  await page.evaluate(() => {
    let target = '';
    Object.defineProperty(window, '__extensionTarget', {
      get: () => target,
      configurable: true,
    });
    Object.defineProperty(window, 'chrome', {
      configurable: true,
      value: {
        storage: {
          local: {
            get: async () => ({ careerOrigin: 'http://localhost:3089' }),
            set: async () => undefined,
          },
        },
        tabs: {
          query: async () => [{ id: 1 }],
          create: async ({ url }: { url: string }) => {
            target = url;
          },
        },
        scripting: {
          executeScript: async ({ func }: { func: () => unknown }) => [
            { result: func() },
          ],
        },
      },
    });
  });
  await page.addScriptTag({ path: resolve(extension, 'popup.js') });
  await page.getByRole('button', { name: 'Capture active tab' }).click();
  await expect(page.getByRole('status')).toContainText('Captured for review');
  const target = await page.evaluate(
    () =>
      (window as unknown as { __extensionTarget: string }).__extensionTarget,
  );
  expect(new URL(target).origin).toBe('http://localhost:3089');
  const encoded = new URLSearchParams(new URL(target).hash.slice(1)).get(
    'capture',
  )!;
  expect(
    JSON.parse(Buffer.from(encoded, 'base64').toString('utf8')),
  ).toMatchObject({
    url: 'https://jobs.example.com/fixture',
    title: 'Engenheiro Sénior',
    company: 'Fixture Org',
    description: 'Build accessible React products.',
  });
});

test('saved-job quotas remain atomic under concurrent saves and retries', async () => {
  requireLocal();
  const user = await registerUser();
  const admin = adminClient();
  try {
    const ids = await seededJobIds(8);
    expect(ids.length).toBeGreaterThanOrEqual(6);
    const responses = await Promise.all(
      ids.map((job_id) => user.ctx.post('/api/save-job', { data: { job_id } })),
    );
    expect(
      responses.filter((response) => response.status() === 200),
    ).toHaveLength(5);
    expect(
      responses.filter((response) => response.status() === 402),
    ).toHaveLength(ids.length - 5);
    const saved = await admin
      .from('saved_jobs')
      .select('job_id')
      .eq('candidate_id', user.candidateId);
    expect(saved.data).toHaveLength(5);
    const retry = await user.ctx.post('/api/save-job', {
      data: { job_id: saved.data![0].job_id },
    });
    expect(retry.status()).toBe(200);
    const removed = await user.ctx.post('/api/save-job', {
      data: { job_id: saved.data![0].job_id, unsave: true },
    });
    expect(removed.status()).toBe(200);
    const missing = ids.find(
      (id) => !saved.data!.some((row) => row.job_id === id),
    );
    expect(
      (
        await user.ctx.post('/api/save-job', { data: { job_id: missing } })
      ).status(),
    ).toBe(200);
  } finally {
    await cleanupUser(user.email);
    await user.ctx.dispose();
  }
});

test('theme follows system changes and preferences from another tab', async ({
  page,
  context,
}) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.removeItem('cs-theme');
    window.dispatchEvent(new Event('storage'));
  });
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveClass(/dark/);
  const other = await context.newPage();
  try {
    await other.goto('/');
    await other.evaluate(() => localStorage.setItem('cs-theme', 'light'));
    await expect(page.locator('html')).not.toHaveClass(/dark/);
    await other.evaluate(() => localStorage.setItem('cs-theme', 'dark'));
    await expect(page.locator('html')).toHaveClass(/dark/);
  } finally {
    await other.close();
  }
});
