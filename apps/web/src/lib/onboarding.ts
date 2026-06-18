export function getOnboardingPath(step: number): string {
  if (step >= 2) return '/onboarding/roles';
  if (step >= 1) return '/onboarding/profile';
  return '/onboarding/cv';
}

export const ONBOARDING_PREFIX = '/onboarding';

export const PROTECTED_CANDIDATE_ROUTES = [
  '/dashboard',
  '/profile',
  '/cv',
  '/recommended',
  '/saved',
  '/applied',
];
