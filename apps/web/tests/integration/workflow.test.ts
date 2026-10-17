import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as schema from '@careersignal/db';

const state = vi.hoisted(() => ({
  db: null as PostgresJsDatabase<typeof schema> | null,
  authenticated: true,
}));
vi.mock('@careersignal/db', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@careersignal/db')>()),
  getDb: () => state.db!,
}));
vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(async () =>
    state.authenticated
      ? { userId: '00000000-0000-4000-8000-000000000001', role: 'candidate' }
      : null,
  ),
}));
vi.mock('@/lib/queries', () => ({
  getCandidateRowByUserId: vi.fn(async () => ({
    id: '00000000-0000-4000-8000-000000000002',
  })),
}));
vi.mock('next/headers', () => ({ cookies: async () => cookieJar }));
const cookieJar = { get: vi.fn(), set: vi.fn() };
import { sealToken, syncGoogleConnection } from '@/lib/integrations/google';
import { POST as startGoogle } from '@/app/api/connections/google/start/route';
import { POST as reviewImport } from '@/app/api/connections/review/route';
import { GET as googleCallback } from '@/app/api/connections/google/callback/route';
import { currentMonth, releaseJdMatch, reserveJdMatch } from '@/lib/access';
import { beginJdRequest, finishJdRequest } from '@/lib/jd-request-ledger';
import { PATCH } from '@/app/api/applications/[id]/route';

// Dedicated runner only: refuse anything except the disposable local verification database.
const url = process.env.CAREERSIGNAL_TEST_DATABASE_URL;
if (
  !url ||
  new URL(url).hostname !== '127.0.0.1' ||
  new URL(url).port !== '55439'
) {
  throw new Error(
    'Set CAREERSIGNAL_TEST_DATABASE_URL to the disposable Postgres container on 127.0.0.1:55439',
  );
}
const namespace = `workflow_${randomUUID().replaceAll('-', '')}`;
const client = postgres(url, {
  max: 20,
  prepare: false,
  connection: { search_path: namespace },
});
const user = '00000000-0000-4000-8000-000000000001';
const candidate = '00000000-0000-4000-8000-000000000002';
const application = '00000000-0000-4000-8000-000000000003';
const version = '2026-01-01T00:00:00.000Z';

beforeAll(async () => {
  await client.unsafe(`CREATE SCHEMA ${namespace}`);
  state.db = drizzle(client);
  await client.unsafe(`CREATE TABLE usage_limits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL UNIQUE,
    cv_upload_count integer NOT NULL DEFAULT 0, jd_match_count_monthly integer NOT NULL DEFAULT 0,
    saved_jobs_count integer NOT NULL DEFAULT 0, tracked_applications_count integer NOT NULL DEFAULT 0,
    current_month text, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL
  ); CREATE TABLE jd_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),candidate_id uuid NOT NULL,user_id uuid NOT NULL,
    request_key text NOT NULL,body_hash text NOT NULL,status text NOT NULL,reserved_month text,response_json jsonb,
    lease_expires_at timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(user_id,request_key)
  ); CREATE TABLE career_connections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),candidate_id uuid NOT NULL,kind text NOT NULL,token_ciphertext text NOT NULL,
    scopes text NOT NULL,last_synced_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),UNIQUE(candidate_id,kind)
  ); CREATE TABLE career_oauth_states (
    state_hash text PRIMARY KEY,candidate_id uuid NOT NULL,kind text NOT NULL,verifier_ciphertext text NOT NULL,expires_at timestamptz NOT NULL
  ); CREATE TABLE career_integration_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),candidate_id uuid NOT NULL,connection_id uuid NOT NULL,external_id text NOT NULL,kind text NOT NULL,
    title text NOT NULL,excerpt text,source_url text,all_day boolean NOT NULL DEFAULT false,starts_at timestamptz,application_id uuid,proposed_status text,reviewed_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),UNIQUE(connection_id,external_id)
  ); CREATE TABLE application_snapshots (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), application_id uuid NOT NULL); CREATE TABLE applications (
    id uuid PRIMARY KEY, candidate_id uuid NOT NULL, job_id uuid NOT NULL, status text NOT NULL,
    cv_version_id uuid, match_score double precision, interview_probability double precision,
    follow_up_due_at timestamptz, next_action text, applied_at timestamptz NOT NULL, updated_at timestamptz NOT NULL
  )`);
});
beforeEach(async () => {
  await client`TRUNCATE usage_limits, applications, application_snapshots, jd_requests, career_connections, career_oauth_states, career_integration_items`;
  state.authenticated = true;
});
afterAll(async () => {
  try {
    await client.unsafe(`DROP SCHEMA IF EXISTS ${namespace} CASCADE`);
  } finally {
    await client.end();
  }
});

describe('atomic monthly quota against Postgres', () => {
  it('admits exactly three of twenty simultaneous first requests', async () => {
    const results = await Promise.all(
      Array.from({ length: 20 }, () => reserveJdMatch(user)),
    );
    expect(results.filter(Boolean)).toHaveLength(3);
    const [row] =
      await client`SELECT jd_match_count_monthly AS used FROM usage_limits WHERE user_id = ${user}`;
    expect(row.used).toBe(3);
  });
  it('refunds capacity on failure and allows another reservation', async () => {
    await Promise.all([
      reserveJdMatch(user),
      reserveJdMatch(user),
      reserveJdMatch(user),
    ]);
    expect(await reserveJdMatch(user)).toBeNull();
    await releaseJdMatch(user, currentMonth());
    expect(await reserveJdMatch(user)).toBe(currentMonth());
  });
  it('resets previous-month usage atomically under contention', async () => {
    await client`INSERT INTO usage_limits (user_id, jd_match_count_monthly, current_month, created_at, updated_at)
      VALUES (${user}, 3, '2000-01', now(), now())`;
    const results = await Promise.all(
      Array.from({ length: 20 }, () => reserveJdMatch(user)),
    );
    expect(results.filter(Boolean)).toHaveLength(3);
    await releaseJdMatch(user, '2000-01');
    const [row] =
      await client`SELECT jd_match_count_monthly AS used FROM usage_limits WHERE user_id = ${user}`;
    expect(row.used).toBe(3);
  });
});

async function seed(owner = candidate) {
  await client`INSERT INTO applications (id, candidate_id, job_id, status, next_action, follow_up_due_at, applied_at, updated_at)
    VALUES (${application}, ${owner}, '00000000-0000-4000-8000-000000000004', 'applied', 'Private recruiter note', now(), ${version}, ${version})`;
}
function update(body: Record<string, unknown>) {
  return PATCH(
    new Request('http://localhost/api/applications/' + application, {
      method: 'PATCH',
      body: JSON.stringify({ expected_updated_at: version, ...body }),
    }),
    { params: Promise.resolve({ id: application }) },
  );
}

describe('application ownership and concurrency against Postgres', () => {
  it('cannot modify a different candidate’s application', async () => {
    await seed('00000000-0000-4000-8000-000000000099');
    expect((await update({ action: 'note', note: 'Overwrite' })).status).toBe(
      409,
    );
    const [row] =
      await client`SELECT next_action FROM applications WHERE id = ${application}`;
    expect(row.next_action).toBe('Private recruiter note');
  });
  it('rejects unauthenticated updates', async () => {
    state.authenticated = false;
    expect((await update({ action: 'complete' })).status).toBe(401);
  });
  it('allows only one concurrent edit of the same version', async () => {
    await seed();
    const responses = await Promise.all([
      update({ action: 'note', note: 'First' }),
      update({ action: 'note', note: 'Second' }),
    ]);
    expect(responses.map((r) => r.status).sort()).toEqual([200, 409]);
  });
  it('completes a reminder without deleting private notes', async () => {
    await seed();
    expect((await update({ action: 'complete' })).status).toBe(200);
    const [row] =
      await client`SELECT next_action, follow_up_due_at FROM applications WHERE id = ${application}`;
    expect(row.follow_up_due_at).toBeNull();
    expect(row.next_action).toBe('Private recruiter note');
  });
  it('clears obsolete reminders when moving to an interview stage', async () => {
    await seed();
    expect(
      (await update({ action: 'status', status: 'technical_round' })).status,
    ).toBe(200);
    const [row] =
      await client`SELECT status, follow_up_due_at FROM applications WHERE id = ${application}`;
    expect(row.status).toBe('technical_round');
    expect(row.follow_up_due_at).toBeNull();
  });
  it('records the submission time when a saved draft first enters the pipeline', async () => {
    await seed();
    await client`UPDATE applications SET status='saved' WHERE id=${application}`;
    const before = Date.now();
    expect((await update({ action: 'status', status: 'applied' })).status).toBe(
      200,
    );
    const [row] =
      await client`SELECT applied_at FROM applications WHERE id=${application}`;
    expect(new Date(row.applied_at).getTime()).toBeGreaterThanOrEqual(before);
  });
  it('preserves the original submission date when an existing submission is restored', async () => {
    await seed();
    await client`UPDATE applications SET status='saved' WHERE id=${application}`;
    await client`INSERT INTO application_snapshots(application_id) VALUES(${application})`;
    expect((await update({ action: 'status', status: 'applied' })).status).toBe(
      200,
    );
    const [row] =
      await client`SELECT applied_at FROM applications WHERE id=${application}`;
    expect(new Date(row.applied_at).toISOString()).toBe(version);
  });
  it('persists a seven-day snooze', async () => {
    await seed();
    const before = Date.now();
    expect((await update({ action: 'snooze' })).status).toBe(200);
    const [row] =
      await client`SELECT follow_up_due_at FROM applications WHERE id = ${application}`;
    expect(new Date(row.follow_up_due_at).getTime()).toBeGreaterThanOrEqual(
      before + 7 * 86400000,
    );
  });
});

describe('durable request idempotency', () => {
  it('starts one provider job for twenty concurrent duplicate requests', async () => {
    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        beginJdRequest(
          user,
          candidate,
          'same-request',
          { jd: 'Python' },
          false,
        ),
      ),
    );
    expect(results.filter((row) => row.kind === 'started')).toHaveLength(1);
    const [usage] =
      await client`SELECT jd_match_count_monthly AS used FROM usage_limits`;
    expect(usage.used).toBe(1);
  });
  it('replays a persisted result and rejects key reuse for different input', async () => {
    const result = await beginJdRequest(
      user,
      candidate,
      'cache-request',
      { jd: 'Python' },
      false,
    );
    if (result.kind !== 'started') throw new Error('Expected start');
    expect(await finishJdRequest(result.id, true, { score: 80 })).toBe(true);
    expect(
      await beginJdRequest(
        user,
        candidate,
        'cache-request',
        { jd: 'Python' },
        false,
      ),
    ).toEqual({ kind: 'cached', data: { score: 80 } });
    expect(
      await beginJdRequest(
        user,
        candidate,
        'cache-request',
        { jd: 'Rust' },
        false,
      ),
    ).toEqual({ kind: 'conflict' });
  });
  it('refunds failures only once', async () => {
    const result = await beginJdRequest(
      user,
      candidate,
      'failure-request',
      { jd: 'Python' },
      false,
    );
    if (result.kind !== 'started') throw new Error('Expected start');
    expect(await finishJdRequest(result.id, false)).toBe(true);
    expect(await finishJdRequest(result.id, false)).toBe(false);
    const [usage] =
      await client`SELECT jd_match_count_monthly AS used FROM usage_limits`;
    expect(usage.used).toBe(0);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
function googleConfiguration() {
  vi.stubEnv('GOOGLE_CLIENT_ID', 'fixture-client');
  vi.stubEnv('GOOGLE_CLIENT_SECRET', 'fixture-secret');
  vi.stubEnv(
    'GOOGLE_REDIRECT_URI',
    'http://localhost/api/connections/google/callback',
  );
  vi.stubEnv(
    'CAREER_TOKEN_ENCRYPTION_KEY',
    Buffer.alloc(32, 7).toString('base64'),
  );
}
describe('Google consent and sync contracts against Postgres with a mocked provider', () => {
  it('requires explicit consent and binds OAuth state to a single callback', async () => {
    googleConfiguration();
    cookieJar.get.mockReset();
    cookieJar.set.mockReset();
    expect(
      (
        await startGoogle(
          new Request('http://localhost/start', {
            method: 'POST',
            body: JSON.stringify({ kind: 'inbox' }),
          }),
        )
      ).status,
    ).toBe(400);
    const result = await startGoogle(
      new Request('http://localhost/start', {
        method: 'POST',
        body: JSON.stringify({ kind: 'inbox', consent: true }),
      }),
    );
    const authorization = new URL((await result.json()).url);
    expect(authorization.searchParams.get('code_challenge_method')).toBe(
      'S256',
    );
    const stateValue = authorization.searchParams.get('state')!;
    cookieJar.get.mockReturnValue({ value: stateValue });
    const fetcher = vi.fn().mockResolvedValue(
      Response.json({
        access_token: 'fixture-access',
        refresh_token: 'fixture-refresh',
        scope: 'https://www.googleapis.com/auth/gmail.readonly',
        expires_in: 3600,
      }),
    );
    vi.stubGlobal('fetch', fetcher);
    const callback = await googleCallback(
      new Request(
        `http://localhost/api/connections/google/callback?state=${stateValue}&code=fixture-code`,
      ),
    );
    expect(callback.headers.get('location')).toContain('connection=connected');
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [stored] =
      await client`SELECT token_ciphertext FROM career_connections`;
    expect(stored.token_ciphertext).not.toContain('fixture-access');
    const replay = await googleCallback(
      new Request(
        `http://localhost/api/connections/google/callback?state=${stateValue}&code=fixture-code`,
      ),
    );
    expect(replay.headers.get('location')).toContain('connection=failed');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('rejects a forged OAuth state before exchanging credentials', async () => {
    googleConfiguration();
    cookieJar.get.mockReturnValue({ value: 'correct-state' });
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    expect(
      (
        await googleCallback(
          new Request(
            'http://localhost/api/connections/google/callback?state=forged&code=fixture-code',
          ),
        )
      ).headers.get('location'),
    ).toContain('connection=rejected');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('imports bounded metadata idempotently and never changes application stages automatically', async () => {
    googleConfiguration();
    await seed();
    const cipher = sealToken(
      { access_token: 'fixture-access', expires_at: Date.now() + 3600000 },
      `${candidate}:inbox`,
    );
    const [connection] =
      await client`INSERT INTO career_connections(candidate_id,kind,token_ciphertext,scopes) VALUES(${candidate},'inbox',${cipher},'fixture') RETURNING id`;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string) =>
        Response.json(
          input.includes('/messages?')
            ? { messages: [{ id: 'message-one' }] }
            : {
                snippet: 'Review this candidate message',
                payload: {
                  headers: [{ name: 'Subject', value: 'Interview with Acme' }],
                },
              },
        ),
      ),
    );
    expect(await syncGoogleConnection(candidate, connection.id)).toMatchObject({
      imported: 1,
      truncated: false,
    });
    expect(await syncGoogleConnection(candidate, connection.id)).toMatchObject({
      imported: 0,
    });
    const [item] =
      await client`SELECT title,proposed_status,reviewed_at FROM career_integration_items`;
    expect(item).toMatchObject({
      title: 'Interview with Acme',
      proposed_status: 'interview',
      reviewed_at: null,
    });
    const [applicationRow] = await client`SELECT status FROM applications`;
    expect(applicationRow.status).toBe('applied');
  });
  it('refreshes expired credentials and reports calendar coverage honestly', async () => {
    googleConfiguration();
    const cipher = sealToken(
      { access_token: 'old', refresh_token: 'fixture-refresh', expires_at: 0 },
      `${candidate}:calendar`,
    );
    const [connection] =
      await client`INSERT INTO career_connections(candidate_id,kind,token_ciphertext,scopes) VALUES(${candidate},'calendar',${cipher},'fixture') RETURNING id`;
    const fetcher = vi.fn(async (input: string) =>
      Response.json(
        input.includes('/token')
          ? { access_token: 'new', expires_in: 3600 }
          : {
              nextPageToken: 'more',
              items: [
                {
                  id: 'event-one',
                  summary: 'Interview',
                  start: { dateTime: '2026-11-01T10:00:00Z' },
                },
              ],
            },
      ),
    );
    vi.stubGlobal('fetch', fetcher);
    expect(await syncGoogleConnection(candidate, connection.id)).toMatchObject({
      imported: 1,
      truncated: true,
      coverage: 'Primary calendar only, next 30 days, up to 50 events',
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('cannot sync another candidate’s connection', async () => {
    googleConfiguration();
    const [connection] =
      await client`INSERT INTO career_connections(candidate_id,kind,token_ciphertext,scopes) VALUES('00000000-0000-4000-8000-000000000099','inbox','cipher','fixture') RETURNING id`;
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    await expect(
      syncGoogleConnection(candidate, connection.id),
    ).rejects.toThrow('not found');
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe('calendar source changes and consent isolation', () => {
  it('updates rescheduled events, invalidates approval, and distinguishes all-day dates', async () => {
    googleConfiguration();
    const cipher = sealToken(
      { access_token: 'fixture', expires_at: Date.now() + 3600000 },
      `${candidate}:calendar`,
    );
    const [connection] =
      await client`INSERT INTO career_connections(candidate_id,kind,token_ciphertext,scopes) VALUES(${candidate},'calendar',${cipher},'fixture') RETURNING id`;
    const fetcher = vi.fn().mockResolvedValue(
      Response.json({
        items: [
          {
            id: 'rescheduled',
            summary: 'Interview',
            start: { dateTime: '2026-11-01T10:00:00Z' },
          },
        ],
      }),
    );
    vi.stubGlobal('fetch', fetcher);
    await syncGoogleConnection(candidate, connection.id);
    await client`UPDATE career_integration_items SET reviewed_at=now(),application_id=${application}`;
    fetcher.mockImplementation(async () =>
      Response.json({
        items: [
          {
            id: 'rescheduled',
            summary: 'Interview',
            start: { date: '2026-11-03' },
          },
        ],
      }),
    );
    expect(await syncGoogleConnection(candidate, connection.id)).toMatchObject({
      imported: 0,
      updated: 1,
    });
    const [item] =
      await client`SELECT reviewed_at,application_id,all_day FROM career_integration_items`;
    expect(item).toEqual({
      reviewed_at: null,
      application_id: null,
      all_day: true,
    });
    expect(await syncGoogleConnection(candidate, connection.id)).toMatchObject({
      imported: 0,
      updated: 0,
    });
    fetcher.mockResolvedValue(
      Response.json({ items: [{ id: 'rescheduled', status: 'cancelled' }] }),
    );
    expect(await syncGoogleConnection(candidate, connection.id)).toMatchObject({
      cancelled: 1,
    });
    expect(await client`SELECT id FROM career_integration_items`).toHaveLength(
      0,
    );
  });
});

describe('reviewed source concurrency', () => {
  it('rejects a stale review, then links the current record without downgrading an advanced stage', async () => {
    await seed();
    await client`UPDATE applications SET status='technical_round'`;
    const [connection] =
      await client`INSERT INTO career_connections(candidate_id,kind,token_ciphertext,scopes) VALUES(${candidate},'calendar','fixture','fixture') RETURNING id`;
    const [item] =
      await client`INSERT INTO career_integration_items(candidate_id,connection_id,external_id,kind,title,proposed_status,updated_at) VALUES(${candidate},${connection.id},'review','calendar','Interview','interview',${version}) RETURNING id`;
    await client`UPDATE career_integration_items SET updated_at='2026-01-02T00:00:00Z' WHERE id=${item.id}`;
    const review = (expectedUpdatedAt: string) =>
      reviewImport(
        new Request('http://localhost/review', {
          method: 'POST',
          body: JSON.stringify({
            id: item.id,
            applicationId: application,
            expectedUpdatedAt,
          }),
        }),
      );
    expect((await review(version)).status).toBe(409);
    expect((await review('2026-01-02T00:00:00Z')).status).toBe(200);
    const [app] = await client`SELECT status FROM applications`;
    expect(app.status).toBe('technical_round');
    const [linked] =
      await client`SELECT application_id,reviewed_at FROM career_integration_items`;
    expect(linked.application_id).toBe(application);
    expect(linked.reviewed_at).not.toBeNull();
  });
  it('discards results collected under an obsolete consent grant', async () => {
    googleConfiguration();
    const cipher = sealToken(
      { access_token: 'fixture', expires_at: Date.now() + 3600000 },
      `${candidate}:calendar`,
    );
    const [connection] =
      await client`INSERT INTO career_connections(candidate_id,kind,token_ciphertext,scopes) VALUES(${candidate},'calendar',${cipher},'fixture') RETURNING id`;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        await client`UPDATE career_connections SET updated_at=updated_at+interval '1 second' WHERE id=${connection.id}`;
        return Response.json({
          items: [
            {
              id: 'old-account',
              summary: 'Interview',
              start: { dateTime: '2026-11-01T10:00:00Z' },
            },
          ],
        });
      }),
    );
    await expect(
      syncGoogleConnection(candidate, connection.id),
    ).rejects.toThrow('Connection changed');
    expect(await client`SELECT id FROM career_integration_items`).toHaveLength(
      0,
    );
  });
});
