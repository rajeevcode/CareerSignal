import { describe, expect, it } from 'vitest';
import type { Application, ApplicationStatus } from '@careersignal/shared';
import { APPLICATION_STAGES, applicationAnalytics, buildCareerActions, isFollowUpDue, parseApplicationAction } from '@/lib/career-actions';

const now = Date.parse('2026-10-17T12:00:00Z');
function app(overrides: Partial<Application> = {}): Application {
  return { id: 'a', candidate_id: 'candidate', job_id: 'job', status: 'applied', cv_version_id: null,
    match_score: null, interview_probability: null, applied_at: '2026-10-01T12:00:00Z',
    updated_at: '2026-10-01T12:00:00Z', follow_up_due_at: '2026-10-16T12:00:00Z', ...overrides };
}

describe('record-backed action queue', () => {
  it('sorts overdue reminders oldest first and excludes future, invalid and completed reminders', () => {
    const rows = [app({ id: 'later' }), app({ id: 'older', follow_up_due_at: '2026-10-15T00:00:00Z' }),
      app({ id: 'future', follow_up_due_at: '2026-10-20T00:00:00Z' }),
      app({ id: 'invalid', follow_up_due_at: 'bad date' }), app({ id: 'done', follow_up_due_at: null })];
    expect(buildCareerActions(rows, 85, now).map((action) => action.id)).toEqual(['follow-up-older', 'follow-up-later']);
  });
  it.each(['offer', 'rejected', 'ghosted', 'saved', 'interview', 'hr_screen', 'technical_round', 'final_round', 'case_study'] satisfies ApplicationStatus[])('does not nag after moving to %s', (status) => {
    expect(isFollowUpDue(app({ status }), now)).toBe(false);
  });
  it('does not invent interviews or improvements for an empty pipeline', () => {
    expect(buildCareerActions([], 90, now)).toEqual([]);
    expect(buildCareerActions([], null, now).map((row) => row.id)).toEqual(['upload-cv']);
    expect(buildCareerActions([], 0, now).map((row) => row.id)).toEqual(['review-cv']);
  });
  it('links preparation to the recorded job, without claiming a scheduled date', () => {
    const [action] = buildCareerActions([app({ status: 'hr_screen' })], 90, now);
    expect(action.href).toBe('/interview-prep?job_id=job');
    expect(action.reason).toContain('date has not been recorded');
  });
});

describe('outcome analytics', () => {
  it('excludes views, reminders and silence from response counts', () => {
    const statuses: ApplicationStatus[] = ['applied', 'saved', 'recruiter_viewed', 'viewed', 'ghosted', 'follow_up_needed', 'shortlisted', 'rejected', 'hr_screen', 'offer'];
    const result = applicationAnalytics(statuses.map((status) => app({ status })), now);
    expect(result.total).toBe(9);
    expect(result.responded).toBe(4);
    expect(result.interviews).toBe(2);
    expect(result.responseRate).toBe(44);
    expect(result.pending).toBe(4);
    expect(result.byRole[0]).toEqual({ role: 'Unknown role', total: 9, responded: 4, interviews: 2 });
  });
  it('reports an undefined response rate for no submitted applications', () => {
    expect(applicationAnalytics([app({ status: 'saved' })], now).responseRate).toBeNull();
  });
});

describe('application update validation', () => {
  const version = { expected_updated_at: '2026-10-17T12:00:00Z' };
  it.each(Object.keys(APPLICATION_STAGES))('accepts stage %s', (status) => {
    expect(parseApplicationAction({ action: 'status', status, ...version })).toMatchObject({ action: 'status', status });
  });
  it('accepts reminder completion, snoozing and trimmed notes', () => {
    expect(parseApplicationAction({ action: 'complete', ...version })).not.toBeNull();
    expect(parseApplicationAction({ action: 'snooze', ...version })).not.toBeNull();
    expect(parseApplicationAction({ action: 'note', note: '  Call recruiter  ', ...version })).toMatchObject({ note: 'Call recruiter' });
  });
  it.each([null, {}, { action: 'status', status: '__proto__', ...version }, { action: 'status', status: 'admin', ...version },
    { action: 'note', note: 'x'.repeat(2001), ...version }, { action: 'note', note: 123, ...version },
    { action: 'snooze' }, { action: 'complete', expected_updated_at: 'yesterday' }, { action: 'delete', ...version }])('rejects malformed update %j', (value) => {
    expect(parseApplicationAction(value)).toBeNull();
  });
});
