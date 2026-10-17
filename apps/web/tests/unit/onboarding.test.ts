import { describe, expect, it } from 'vitest';
import {
  CAREER_OUTCOMES,
  ONBOARDING_COMPLETE_STEP,
  ONBOARDING_PREFIX,
  PROTECTED_CANDIDATE_ROUTES,
  TARGET_MARKETS,
  getOnboardingPath,
} from '@/lib/onboarding';

describe('getOnboardingPath', () => {
  it.each([
    [-1, '/onboarding/welcome'],
    [0, '/onboarding/welcome'],
    [1, '/onboarding/cv'],
    [2, '/onboarding/roles'],
    [3, '/onboarding/market'],
    [4, '/onboarding/preferences'],
    [5, '/onboarding/analyzing'],
    [6, '/onboarding/results'],
    [ONBOARDING_COMPLETE_STEP, '/onboarding/results'],
    [99, '/onboarding/results'],
  ])('maps step %i to %s', (step, expected) => {
    expect(getOnboardingPath(step)).toBe(expected);
  });
});

describe('onboarding and route contracts', () => {
  it('keeps protected candidate routes absolute, unique, and outside onboarding', () => {
    expect(new Set(PROTECTED_CANDIDATE_ROUTES).size).toBe(PROTECTED_CANDIDATE_ROUTES.length);
    for (const route of PROTECTED_CANDIDATE_ROUTES) {
      expect(route).toMatch(/^\/[a-z-]+$/);
      expect(route.startsWith(ONBOARDING_PREFIX)).toBe(false);
    }
  });

  it('exposes unique, non-empty choice lists', () => {
    expect(new Set(CAREER_OUTCOMES).size).toBe(CAREER_OUTCOMES.length);
    expect(new Set(TARGET_MARKETS).size).toBe(TARGET_MARKETS.length);
    expect(CAREER_OUTCOMES.every(Boolean)).toBe(true);
    expect(TARGET_MARKETS.every(Boolean)).toBe(true);
  });
});
