export function getOnboardingPath(step: number): string {
  if (step >= 6) return '/onboarding/results';
  if (step >= 5) return '/onboarding/analyzing';
  if (step >= 4) return '/onboarding/preferences';
  if (step >= 3) return '/onboarding/market';
  if (step >= 2) return '/onboarding/roles';
  if (step >= 1) return '/onboarding/cv';
  return '/onboarding/welcome';
}

export const ONBOARDING_PREFIX = '/onboarding';
export const ONBOARDING_COMPLETE_STEP = 7;

export const PROTECTED_CANDIDATE_ROUTES = [
  '/dashboard',
  '/profile',
  '/cv',
  '/cv-builder',
  '/recommended',
  '/saved',
  '/applied',
  '/applications',
  '/interview-prep',
  '/resume-score',
  '/jd-match-tool',
  '/ats-check',
  '/cover-letters',
  '/career-coach',
  '/account',
];

export const CAREER_OUTCOMES = [
  'Find a new job',
  'Improve my CV',
  'Match my CV to a job',
  'Prepare for interviews',
  'Track my job search',
  'Explore career options',
] as const;

export const TARGET_MARKETS = [
  'India',
  'Dubai',
  'Germany',
  'Portugal',
  'Spain',
  'Remote EU',
  'Remote Global',
] as const;
