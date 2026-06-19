// Session payload shape shared across the app. Auth is now handled by Supabase
// (@supabase/ssr); this file only carries the type used by the session adapter.

export interface SessionPayload {
  userId: string;
  email: string;
  role: 'candidate' | 'recruiter' | 'admin';
  plan?: 'free' | 'pro';
  onboardingComplete?: boolean;
  onboardingStep?: number;
}
