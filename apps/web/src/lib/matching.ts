import { aiFetch } from '@/lib/utils';
import { listMatchScoresForCandidate } from '@/lib/queries';

export type BatchMatchState = 'ready' | 'unavailable';

export async function ensureBatchMatch(candidateId: string, limit = 50): Promise<BatchMatchState> {
  const existing = await listMatchScoresForCandidate(candidateId);
  if (existing.length > 0) return 'ready';

  try {
    const response = await aiFetch('/match/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidate_id: candidateId, limit }),
      signal: AbortSignal.timeout(30_000),
    });
    if (response.ok) return 'ready';
    console.warn(`[batch-match] AI service returned ${response.status}`);
  } catch {
    console.warn('[batch-match] AI service unavailable or timed out');
  }
  return 'unavailable';
}
