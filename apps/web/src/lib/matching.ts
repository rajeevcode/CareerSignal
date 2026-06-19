import { getAiServiceUrl } from '@/lib/utils';
import { listMatchScoresForCandidate } from '@/lib/queries';

export async function ensureBatchMatch(candidateId: string, limit = 50): Promise<void> {
  const existing = await listMatchScoresForCandidate(candidateId);
  if (existing.length > 0) return;

  try {
    await fetch(`${getAiServiceUrl()}/match/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidate_id: candidateId, limit }),
    });
  } catch {
    // AI service may be offline; pages handle empty matches gracefully
  }
}
