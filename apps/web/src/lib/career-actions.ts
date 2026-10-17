import type { Application, ApplicationStatus } from '@careersignal/shared';

export const APPLICATION_STAGES: Record<ApplicationStatus, string> = {
  saved: 'Saved', applied: 'Applied', viewed: 'Viewed', recruiter_viewed: 'Recruiter viewed',
  shortlisted: 'Shortlisted', hr_screen: 'HR screen', technical_round: 'Technical round',
  case_study: 'Case study', final_round: 'Final round', interview: 'Interview', offer: 'Offer',
  rejected: 'Rejected', ghosted: 'Ghosted', follow_up_needed: 'Follow-up needed',
};
const FOLLOW_UP_STAGES = new Set<ApplicationStatus>(['applied', 'viewed', 'recruiter_viewed', 'shortlisted', 'follow_up_needed']);
const INTERVIEW_STAGES = new Set<ApplicationStatus>(['hr_screen', 'technical_round', 'case_study', 'final_round', 'interview']);
// These statuses record an employer response. A reminder, a view or silence does not.
const RESPONSE_STAGES = new Set<ApplicationStatus>([...INTERVIEW_STAGES, 'shortlisted', 'offer', 'rejected']);

export function isFollowUpDue(app: Application, now = Date.now()): boolean {
  if (!FOLLOW_UP_STAGES.has(app.status) || !app.follow_up_due_at) return false;
  const due = Date.parse(app.follow_up_due_at);
  return Number.isFinite(due) && due <= now;
}

export interface CareerAction {
  id: string;
  label: string;
  reason: string;
  href: string;
  application?: Application;
}

export function buildCareerActions(apps: Application[], cvScore: number | null, now = Date.now()): CareerAction[] {
  const followUps = apps.filter((app) => isFollowUpDue(app, now))
    .sort((a, b) => Date.parse(a.follow_up_due_at!) - Date.parse(b.follow_up_due_at!))
    .map((app): CareerAction => ({
      id: `follow-up-${app.id}`, label: `Follow up: ${app.job?.title ?? 'Application'}`,
      reason: `${app.job?.company?.name ?? 'Tracked employer'} · due ${app.follow_up_due_at!.slice(0, 10)} (UTC)`,
      href: `/applications/${app.id}`, application: app,
    }));
  const interviews = apps.filter((app) => INTERVIEW_STAGES.has(app.status)).map((app): CareerAction => ({
    id: `prepare-${app.id}`, label: `Prepare: ${app.job?.title ?? 'Interview'}`,
    reason: `Recorded stage: ${APPLICATION_STAGES[app.status]}. Interview date has not been recorded.`,
    href: `/interview-prep?job_id=${encodeURIComponent(app.job_id)}`,
  }));
  const cv: CareerAction[] = cvScore === null ? [{
    id: 'upload-cv', label: 'Upload your CV', reason: 'No CV score has been recorded.', href: '/cv',
  }] : cvScore < 80 ? [{
    id: 'review-cv', label: 'Review your CV feedback', reason: `Your current CV score is ${Math.round(cvScore)}/100.`, href: '/resume-score',
  }] : [];
  return [...followUps, ...interviews, ...cv];
}

export function applicationAnalytics(apps: Application[], now = Date.now()) {
  const submitted = apps.filter((app) => app.status !== 'saved');
  const responded = submitted.filter((app) => RESPONSE_STAGES.has(app.status)).length;
  const interviews = submitted.filter((app) => INTERVIEW_STAGES.has(app.status) || app.status === 'offer').length;
  const groups = new Map<string, Application[]>();
  for (const app of submitted) {
    const role = app.job?.title ?? 'Unknown role';
    groups.set(role, [...(groups.get(role) ?? []), app]);
  }
  return {
    total: submitted.length, interviews, responded,
    pending: submitted.filter((app) => !RESPONSE_STAGES.has(app.status) && app.status !== 'ghosted').length,
    responseRate: submitted.length ? Math.round(responded / submitted.length * 100) : null,
    followUpsDue: apps.filter((app) => isFollowUpDue(app, now)).length,
    byRole: [...groups].map(([role, rows]) => ({
      role, total: rows.length, responded: rows.filter((app) => RESPONSE_STAGES.has(app.status)).length,
      interviews: rows.filter((app) => INTERVIEW_STAGES.has(app.status) || app.status === 'offer').length,
    })).sort((a, b) => b.total - a.total || a.role.localeCompare(b.role)),
  };
}

export type ApplicationAction =
  | { action: 'snooze' | 'complete' }
  | { action: 'status'; status: ApplicationStatus }
  | { action: 'note'; note: string };

export function parseApplicationAction(value: unknown): (ApplicationAction & { expected_updated_at: string }) | null {
  if (!value || typeof value !== 'object') return null;
  const body = value as Record<string, unknown>;
  if (typeof body.expected_updated_at !== 'string' || !Number.isFinite(Date.parse(body.expected_updated_at))) return null;
  const version = { expected_updated_at: body.expected_updated_at };
  switch (body.action) {
    case 'snooze': case 'complete': return { action: body.action, ...version };
    case 'status':
      return typeof body.status === 'string' && Object.hasOwn(APPLICATION_STAGES, body.status)
        ? { action: 'status', status: body.status as ApplicationStatus, ...version } : null;
    case 'note':
      return typeof body.note === 'string' && body.note.length <= 2000
        ? { action: 'note', note: body.note.trim(), ...version } : null;
    default: return null;
  }
}
