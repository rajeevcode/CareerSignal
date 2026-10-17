import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/queries', () => ({ listMatchScoresForCandidate: vi.fn() }));
vi.mock('@/lib/utils', () => ({ aiFetch: vi.fn() }));
import { listMatchScoresForCandidate } from '@/lib/queries';
import { aiFetch } from '@/lib/utils';
import { ensureBatchMatch } from '@/lib/matching';

beforeEach(() => { vi.resetAllMocks(); vi.mocked(listMatchScoresForCandidate).mockResolvedValue([]); });
describe('batch match recovery', () => {
  it('uses the authenticated helper with a timeout', async () => {
    vi.mocked(aiFetch).mockResolvedValue(new Response('{}'));
    expect(await ensureBatchMatch('candidate')).toBe('ready');
    expect(aiFetch).toHaveBeenCalledWith('/match/batch', expect.objectContaining({ signal: expect.any(AbortSignal), body: JSON.stringify({ candidate_id: 'candidate', limit: 50 }) }));
  });
  it.each([401, 503])('returns unavailable for HTTP %s instead of silently succeeding', async (status) => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.mocked(aiFetch).mockResolvedValue(new Response('', { status }));
    expect(await ensureBatchMatch('candidate')).toBe('unavailable');
    vi.restoreAllMocks();
  });
  it('returns unavailable on transport failure', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.mocked(aiFetch).mockRejectedValue(new Error('offline'));
    expect(await ensureBatchMatch('candidate')).toBe('unavailable');
    vi.restoreAllMocks();
  });
});
