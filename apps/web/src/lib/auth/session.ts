import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { SessionPayload } from './token';

export type { SessionPayload };

/**
 * Auth adapter over Supabase Auth. Preserves the app's existing helper API
 * (getSession/getCurrentUser/registerUser/loginUser/…) so routes & pages are
 * unchanged. Identity lives in auth.users + profiles; plan in subscriptions;
 * onboarding in candidate_profiles. Reads use the admin client (privileged) to
 * assemble the session payload regardless of RLS.
 */

interface PlanRoleOnboarding {
  role: SessionPayload['role'];
  plan: 'free' | 'pro';
  onboardingComplete: boolean;
  onboardingStep: number;
}

async function loadPlanRoleOnboarding(userId: string): Promise<PlanRoleOnboarding> {
  const admin = createSupabaseAdminClient();

  const [{ data: profile }, { data: sub }, { data: candidate }] = await Promise.all([
    admin.from('profiles').select('role').eq('id', userId).maybeSingle(),
    admin.from('subscriptions').select('plan').eq('user_id', userId).maybeSingle(),
    admin
      .from('candidate_profiles')
      .select('id, onboarding_complete, onboarding_step, cv_score, target_roles')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  const role = (profile?.role ?? 'candidate') as SessionPayload['role'];
  const plan = (sub?.plan ?? 'free') as 'free' | 'pro';

  if (role !== 'candidate') {
    return { role, plan, onboardingComplete: true, onboardingStep: 3 };
  }
  if (!candidate) {
    return { role, plan, onboardingComplete: false, onboardingStep: 0 };
  }

  let onboardingComplete = candidate.onboarding_complete ?? false;
  let onboardingStep = candidate.onboarding_step ?? 0;

  // Lazy onboarding completion: CV scored + target roles chosen.
  if (!onboardingComplete) {
    const hasCv = candidate.cv_score != null;
    const hasRoles = Array.isArray(candidate.target_roles) && candidate.target_roles.length > 0;
    if (hasCv && hasRoles) {
      await admin
        .from('candidate_profiles')
        .update({ onboarding_complete: true, onboarding_step: 3 })
        .eq('id', candidate.id);
      onboardingComplete = true;
      onboardingStep = 3;
    }
  }

  return { role, plan, onboardingComplete, onboardingStep };
}

export async function getSession(): Promise<SessionPayload | null> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { role, plan, onboardingComplete, onboardingStep } = await loadPlanRoleOnboarding(user.id);
  return {
    userId: user.id,
    email: user.email ?? '',
    role,
    plan,
    onboardingComplete,
    onboardingStep,
  };
}

export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createSupabaseAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('role, full_name, avatar_url, created_at, updated_at')
    .eq('id', user.id)
    .maybeSingle();
  const { data: sub } = await admin.from('subscriptions').select('plan').eq('user_id', user.id).maybeSingle();

  return {
    id: user.id,
    email: user.email ?? '',
    role: (profile?.role ?? 'candidate') as SessionPayload['role'],
    plan: (sub?.plan ?? 'free') as 'free' | 'pro',
    full_name: profile?.full_name ?? null,
    avatar_url: profile?.avatar_url ?? null,
    created_at: profile?.created_at ?? null,
    updated_at: profile?.updated_at ?? null,
  };
}

export async function getSessionPayloadForUser(
  userId: string,
  email: string,
  role?: SessionPayload['role'],
): Promise<SessionPayload> {
  const loaded = await loadPlanRoleOnboarding(userId);
  return {
    userId,
    email,
    role: role ?? loaded.role,
    plan: loaded.plan,
    onboardingComplete: loaded.onboardingComplete,
    onboardingStep: loaded.onboardingStep,
  };
}

/** Supabase owns the session cookie; plan is read live, so this is a no-op kept for API compatibility. */
export async function refreshSessionPlan(session: SessionPayload) {
  return getSessionPayloadForUser(session.userId, session.email, session.role);
}

/** Supabase manages auth cookies via the SSR client; these remain for call-site compatibility. */
export async function setSessionCookie(_payload: SessionPayload) {
  /* no-op: Supabase SSR client manages cookies */
}

export async function clearSessionCookie() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
}

export async function registerUser(email: string, password: string, fullName: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: email.toLowerCase(),
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) {
    if (/already registered|already exists|user already/i.test(error.message)) {
      throw new Error('Email already registered');
    }
    throw new Error(error.message);
  }
  // With email confirmations enabled, Supabase does NOT error on a duplicate;
  // it returns a user with an empty `identities` array. Treat that as a dupe.
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    throw new Error('Email already registered');
  }
  // The on_auth_user_created trigger creates profile/candidate/usage/subscription.
  const userId = data.user?.id;
  if (!userId) throw new Error('Registration failed');
  return getSessionPayloadForUser(userId, email.toLowerCase(), 'candidate');
}

export async function loginUser(email: string, password: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.toLowerCase(),
    password,
  });
  if (error || !data.user) throw new Error('Invalid email or password');
  return getSessionPayloadForUser(data.user.id, data.user.email ?? email.toLowerCase());
}
