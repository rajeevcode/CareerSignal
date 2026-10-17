import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/auth/session', () => ({ getSession: vi.fn() }));
vi.mock('@/lib/queries', () => ({ getCandidateRowByUserId: vi.fn() }));
vi.mock('@/lib/utils', () => ({ aiFetch: vi.fn() }));
vi.mock('@/lib/access', () => ({ getUserPlan: vi.fn() }));
vi.mock('@/lib/jd-request-ledger', () => ({
  beginJdRequest: vi.fn(),
  finishJdRequest: vi.fn(),
}));
import { getSession } from '@/lib/auth/session';
import { getCandidateRowByUserId } from '@/lib/queries';
import { aiFetch } from '@/lib/utils';
import { getUserPlan } from '@/lib/access';
import { beginJdRequest, finishJdRequest } from '@/lib/jd-request-ledger';
import { POST } from '@/app/api/match-jd/route';
const request = (body: unknown, key = 'request-key-123') =>
  new Request('http://localhost/api/match-jd', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Idempotency-Key': key },
  });
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getSession).mockResolvedValue({
    userId: 'user',
    role: 'candidate',
  } as Awaited<ReturnType<typeof getSession>>);
  vi.mocked(getCandidateRowByUserId).mockResolvedValue({
    id: 'candidate',
  } as NonNullable<Awaited<ReturnType<typeof getCandidateRowByUserId>>>);
  vi.mocked(getUserPlan).mockResolvedValue('free');
  vi.mocked(beginJdRequest).mockResolvedValue({
    kind: 'started',
    id: 'reservation',
  });
  vi.mocked(finishJdRequest).mockResolvedValue(true);
  vi.mocked(aiFetch).mockResolvedValue(Response.json({ jd_match_score: 80 }));
});
describe('durable JD request lifecycle', () => {
  it('starts a reservation before provider work and records the response', async () => {
    expect((await POST(request({ jd_text: 'Python role' }))).status).toBe(200);
    expect(vi.mocked(beginJdRequest).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(aiFetch).mock.invocationCallOrder[0],
    );
    expect(finishJdRequest).toHaveBeenCalledExactlyOnceWith(
      'reservation',
      true,
      { jd_match_score: 80 },
    );
  });
  it.each([
    ['pending', 202],
    ['conflict', 409],
    ['denied', 402],
    ['failed', 409],
  ] as const)(
    'handles %s without invoking the provider',
    async (kind, status) => {
      vi.mocked(beginJdRequest).mockResolvedValue({ kind });
      expect((await POST(request({ jd_text: 'Python' }))).status).toBe(status);
      expect(aiFetch).not.toHaveBeenCalled();
    },
  );
  it('replays cached responses even after quota is exhausted', async () => {
    vi.mocked(beginJdRequest).mockResolvedValue({
      kind: 'cached',
      data: { interview_signal: 75 },
    });
    const result = await POST(request({ jd_text: 'Python' }));
    expect(await result.json()).toEqual({ interview_signal: 75 });
    expect(aiFetch).not.toHaveBeenCalled();
  });
  it.each([401, 500, 503])(
    'closes failed upstream HTTP %s once',
    async (status) => {
      vi.mocked(aiFetch).mockResolvedValue(new Response('', { status }));
      expect((await POST(request({ jd_text: 'Python' }))).status).toBe(500);
      expect(finishJdRequest).toHaveBeenCalledExactlyOnceWith(
        'reservation',
        false,
      );
    },
  );
  it('closes transport failures for immediate refund', async () => {
    vi.mocked(aiFetch).mockRejectedValue(new Error('timeout'));
    expect((await POST(request({ jd_text: 'Python' }))).status).toBe(503);
    expect(finishJdRequest).toHaveBeenCalledWith('reservation', false);
  });
  it('rejects foreign candidates and malformed payloads before reserving', async () => {
    expect(
      (await POST(request({ candidate_id: 'other', jd_text: 'Python' })))
        .status,
    ).toBe(403);
    for (const value of [
      null,
      [],
      {},
      { jd_text: 42 },
      { jd_text: 'x'.repeat(50001) },
    ])
      expect((await POST(request(value))).status).toBe(400);
    expect(beginJdRequest).not.toHaveBeenCalled();
  });
  it('rejects unauthenticated callers', async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    expect((await POST(request({ jd_text: 'Python' }))).status).toBe(401);
  });
});
