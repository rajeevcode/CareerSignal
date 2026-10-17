import { describe, expect, it } from 'vitest';
import { mapApplication, type applications } from '@careersignal/db';

const row: typeof applications.$inferSelect = {
  id: 'a', candidateId: 'candidate', jobId: 'job', status: 'applied', cvVersionId: null,
  matchScore: null, interviewProbability: null, followUpDueAt: '2026-10-01T00:00:00Z',
  nextAction: 'Private note about salary negotiation', appliedAt: '2026-09-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z',
};
describe('candidate note privacy', () => {
  it('omits private notes from default recruiter-facing mappings', () => {
    const mapped = mapApplication(row);
    expect(mapped).not.toHaveProperty('next_action');
    expect(mapped).not.toHaveProperty('follow_up_due_at');
  });
  it('includes notes only when a candidate-scoped caller explicitly opts in', () => {
    expect(mapApplication(row, undefined, { includePrivateNotes: true })).toMatchObject({
      next_action: row.nextAction, follow_up_due_at: row.followUpDueAt,
    });
  });
});
