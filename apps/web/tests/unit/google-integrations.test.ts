import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  sealToken,
  unsealToken,
  stateHash,
  suggestedStatus,
  googleRead,
  googleToken,
} from '@/lib/integrations/google';
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
describe('connection credential protection', () => {
  it('encrypts credentials with authenticated ownership binding', () => {
    vi.stubEnv(
      'CAREER_TOKEN_ENCRYPTION_KEY',
      Buffer.alloc(32, 7).toString('base64'),
    );
    const cipher = sealToken(
      { refresh_token: 'fixture-token' },
      'candidate:inbox',
    );
    expect(cipher).not.toContain('fixture-token');
    expect(unsealToken(cipher, 'candidate:inbox')).toEqual({
      refresh_token: 'fixture-token',
    });
    expect(() => unsealToken(cipher, 'another-candidate:inbox')).toThrow();
    const damaged = Buffer.from(cipher, 'base64');
    damaged[damaged.length - 1] ^= 1;
    expect(() =>
      unsealToken(damaged.toString('base64'), 'candidate:inbox'),
    ).toThrow();
  });
  it('refuses missing encryption configuration', () => {
    vi.stubEnv('CAREER_TOKEN_ENCRYPTION_KEY', '');
    expect(() => sealToken({}, 'candidate')).toThrow();
  });
  it('hashes OAuth state and treats suggested stages as fallible candidates', () => {
    expect(stateHash('one')).not.toBe(stateHash('two'));
    expect(suggestedStatus('Interview at Acme')).toBe('interview');
    expect(suggestedStatus('Newsletter')).toBeNull();
    expect(suggestedStatus('We are not moving forward')).toBe('rejected');
  });
});
describe('Google adapter contract with a mocked provider', () => {
  it('uses bearer authorization and returns parsed records', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(Response.json({ items: [{ id: 'event-1' }] }));
    vi.stubGlobal('fetch', fetcher);
    expect(
      await googleRead(
        '/calendar/v3/calendars/primary/events',
        'fixture-access',
      ),
    ).toEqual({ items: [{ id: 'event-1' }] });
    expect(fetcher).toHaveBeenCalledWith(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      expect.objectContaining({
        headers: { Authorization: 'Bearer fixture-access' },
      }),
    );
  });
  it('retries throttling with bounded exponential backoff', async () => {
    vi.useFakeTimers();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 429 }))
      .mockResolvedValueOnce(Response.json({ messages: [] }));
    vi.stubGlobal('fetch', fetcher);
    const result = googleRead('/gmail/v1/users/me/messages', 'fixture-access');
    await vi.runAllTimersAsync();
    expect(await result).toEqual({ messages: [] });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('does not silently treat scope errors as an empty result', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('', { status: 403 })),
    );
    await expect(
      googleRead('/gmail/v1/users/me/messages', 'fixture-access'),
    ).rejects.toThrow();
  });
  it('exchanges an authorization code with the configured redirect and PKCE verifier', async () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', 'fixture-client');
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'fixture-secret');
    vi.stubEnv(
      'GOOGLE_REDIRECT_URI',
      'http://localhost:3089/api/connections/google/callback',
    );
    vi.stubEnv(
      'CAREER_TOKEN_ENCRYPTION_KEY',
      Buffer.alloc(32).toString('base64'),
    );
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        Response.json({ access_token: 'fixture-access', expires_in: 3600 }),
      );
    vi.stubGlobal('fetch', fetcher);
    await expect(
      googleToken({
        grant_type: 'authorization_code',
        code: 'fixture-code',
        code_verifier: 'fixture-verifier',
      }),
    ).resolves.toMatchObject({ access_token: 'fixture-access' });
    const options = fetcher.mock.calls[0][1] as RequestInit;
    expect(String(options.body)).toContain('code_verifier=fixture-verifier');
  });
});
