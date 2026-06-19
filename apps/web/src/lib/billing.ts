// Client-safe billing constants & gating helpers. No server imports — usable anywhere.

export const FREE_LIMITS = {
  cvUploads: 3,
  activeCvVersions: 1,
  jdMatchesMonthly: 3,
  savedJobs: 5,
  trackedApplications: 10,
} as const;

export const PRO_PRICE_LABEL = '₹749';
export const PRO_CADENCE_LABEL = '/ month';

export const PRO_BENEFITS = [
  'Unlimited CV uploads & versions',
  'Unlimited JD matches',
  'Advanced CV score with section feedback',
  'AI bullet & summary rewrite',
  'Estimated shortlisting probability',
  'Unlimited saved jobs & application tracking',
  'Application analytics',
  'Interview Prep Studio & Career Coach',
  'AI cover letters',
  'Export optimized CV (PDF)',
];

export type PlanType = 'free' | 'pro';

export type FeatureKey =
  | 'upload_cv'
  | 'create_cv_version'
  | 'jd_match'
  | 'advanced_jd_match'
  | 'advanced_cv_score'
  | 'cv_rewrite'
  | 'save_job'
  | 'track_application'
  | 'application_analytics'
  | 'interview_prep'
  | 'career_coach'
  | 'cover_letter'
  | 'export_cv'
  | 'priority_alerts';

export type UsageState = {
  cv_upload_count: number;
  jd_match_count_monthly: number;
  saved_jobs_count: number;
  tracked_applications_count: number;
  current_month: string;
};

export type PlanState = {
  plan: PlanType;
  usage: UsageState;
};

export type GateResult =
  | { allowed: true }
  | { allowed: false; reason: string; feature: FeatureKey };

export function canUseFeature(state: PlanState, feature: FeatureKey): GateResult {
  if (state.plan === 'pro') return { allowed: true };
  const u = state.usage;
  switch (feature) {
    case 'upload_cv':
      return u.cv_upload_count < FREE_LIMITS.cvUploads
        ? { allowed: true }
        : { allowed: false, feature, reason: `You've used all ${FREE_LIMITS.cvUploads} free CV uploads.` };
    case 'jd_match':
      return u.jd_match_count_monthly < FREE_LIMITS.jdMatchesMonthly
        ? { allowed: true }
        : { allowed: false, feature, reason: `You've used your ${FREE_LIMITS.jdMatchesMonthly} free JD matches this month.` };
    case 'save_job':
      return u.saved_jobs_count < FREE_LIMITS.savedJobs
        ? { allowed: true }
        : { allowed: false, feature, reason: `You've saved the ${FREE_LIMITS.savedJobs} jobs the Free plan allows.` };
    case 'track_application':
      return u.tracked_applications_count < FREE_LIMITS.trackedApplications
        ? { allowed: true }
        : { allowed: false, feature, reason: `You're tracking ${FREE_LIMITS.trackedApplications} applications — the Free limit.` };
    case 'create_cv_version':
    case 'advanced_jd_match':
    case 'advanced_cv_score':
    case 'cv_rewrite':
    case 'application_analytics':
    case 'interview_prep':
    case 'career_coach':
    case 'cover_letter':
    case 'export_cv':
    case 'priority_alerts':
      return { allowed: false, feature, reason: 'This is a CareerSignal Pro feature.' };
  }
}

export function remaining(state: PlanState) {
  if (state.plan === 'pro') return null;
  const u = state.usage;
  return {
    cvUploads: Math.max(0, FREE_LIMITS.cvUploads - u.cv_upload_count),
    jdMatches: Math.max(0, FREE_LIMITS.jdMatchesMonthly - u.jd_match_count_monthly),
    savedJobs: Math.max(0, FREE_LIMITS.savedJobs - u.saved_jobs_count),
    trackedApps: Math.max(0, FREE_LIMITS.trackedApplications - u.tracked_applications_count),
  };
}

/** Parse a 402 paywall response body shape: { error, upgrade, feature }. */
export function parsePaywallError(body: unknown): { reason: string; feature?: FeatureKey } | null {
  if (body && typeof body === 'object' && 'upgrade' in body && (body as { upgrade?: boolean }).upgrade) {
    const b = body as { error?: string; feature?: FeatureKey };
    return { reason: b.error || 'This is a Pro feature.', feature: b.feature };
  }
  return null;
}
