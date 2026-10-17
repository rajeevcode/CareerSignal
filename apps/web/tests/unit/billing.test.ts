import { describe, expect, it } from 'vitest';
import {
  FREE_LIMITS,
  canUseFeature,
  parsePaywallError,
  remaining,
  type FeatureKey,
  type PlanState,
} from '@/lib/billing';

const allFeatures: FeatureKey[] = [
  'upload_cv',
  'create_cv_version',
  'jd_match',
  'advanced_jd_match',
  'advanced_cv_score',
  'cv_rewrite',
  'save_job',
  'track_application',
  'application_analytics',
  'interview_prep',
  'career_coach',
  'cover_letter',
  'export_cv',
  'priority_alerts',
];

function state(
  plan: PlanState['plan'] = 'free',
  usage: Partial<PlanState['usage']> = {},
): PlanState {
  return {
    plan,
    usage: {
      cv_upload_count: 0,
      jd_match_count_monthly: 0,
      saved_jobs_count: 0,
      tracked_applications_count: 0,
      current_month: '2026-07',
      ...usage,
    },
  };
}

describe('canUseFeature', () => {
  it('allows every feature for Pro users regardless of recorded usage', () => {
    const pro = state('pro', {
      cv_upload_count: 999,
      jd_match_count_monthly: 999,
      saved_jobs_count: 999,
      tracked_applications_count: 999,
    });

    for (const feature of allFeatures) {
      expect(canUseFeature(pro, feature)).toEqual({ allowed: true });
    }
  });

  it.each([
    ['upload_cv', 'cv_upload_count', FREE_LIMITS.cvUploads],
    ['jd_match', 'jd_match_count_monthly', FREE_LIMITS.jdMatchesMonthly],
    ['save_job', 'saved_jobs_count', FREE_LIMITS.savedJobs],
    ['track_application', 'tracked_applications_count', FREE_LIMITS.trackedApplications],
  ] as const)(
    'allows %s below its free limit and blocks it at the limit',
    (feature, usageKey, limit) => {
      expect(canUseFeature(state('free', { [usageKey]: limit - 1 }), feature)).toEqual({
        allowed: true,
      });

      const blocked = canUseFeature(state('free', { [usageKey]: limit }), feature);
      expect(blocked).toMatchObject({ allowed: false, feature });
      expect('reason' in blocked ? blocked.reason : '').toContain(String(limit));
    },
  );

  it('blocks every Pro-only feature for free users', () => {
    const quotaFeatures = new Set<FeatureKey>([
      'upload_cv',
      'jd_match',
      'save_job',
      'track_application',
    ]);

    for (const feature of allFeatures.filter((key) => !quotaFeatures.has(key))) {
      expect(canUseFeature(state(), feature)).toEqual({
        allowed: false,
        feature,
        reason: 'This is a CareerSignal Pro feature.',
      });
    }
  });
});

describe('remaining', () => {
  it('returns null for Pro and exact remaining quotas for free users', () => {
    expect(remaining(state('pro'))).toBeNull();
    expect(
      remaining(
        state('free', {
          cv_upload_count: 1,
          jd_match_count_monthly: 2,
          saved_jobs_count: 3,
          tracked_applications_count: 4,
        }),
      ),
    ).toEqual({
      cvUploads: 2,
      jdMatches: 1,
      savedJobs: 2,
      trackedApps: 6,
    });
  });

  it('never reports negative remaining quota for stale over-limit data', () => {
    expect(
      remaining(
        state('free', {
          cv_upload_count: 30,
          jd_match_count_monthly: 30,
          saved_jobs_count: 30,
          tracked_applications_count: 30,
        }),
      ),
    ).toEqual({ cvUploads: 0, jdMatches: 0, savedJobs: 0, trackedApps: 0 });
  });
});

describe('parsePaywallError', () => {
  it('parses a typed paywall body', () => {
    expect(
      parsePaywallError({
        error: 'Quota exhausted',
        upgrade: true,
        feature: 'jd_match',
      }),
    ).toEqual({ reason: 'Quota exhausted', feature: 'jd_match' });
  });

  it('uses a safe fallback reason and rejects non-paywall bodies', () => {
    expect(parsePaywallError({ upgrade: true })).toEqual({
      reason: 'This is a Pro feature.',
      feature: undefined,
    });
    expect(parsePaywallError({ upgrade: false, error: 'No' })).toBeNull();
    expect(parsePaywallError(null)).toBeNull();
    expect(parsePaywallError('upgrade')).toBeNull();
  });

  it('does not trust malformed feature keys or error values from an API response', () => {
    expect(
      parsePaywallError({
        error: { message: 'not a string' },
        upgrade: true,
        feature: 'admin',
      }),
    ).toEqual({
      reason: 'This is a Pro feature.',
      feature: undefined,
    });
  });
});
