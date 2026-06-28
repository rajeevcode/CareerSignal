'use client';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { safeRedirectPath } from '@/lib/utils';

export type OAuthResult = { ok: boolean; error?: string };

/** Friendly message when a provider isn't enabled in Supabase yet. */
const NOT_CONFIGURED = "Social login isn't set up yet. Please use email instead.";

function buildRedirectTo(redirect?: string): string {
  const dest = safeRedirectPath(redirect);
  return `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(dest)}`;
}

async function providerIsEnabled(provider: 'google' | 'linkedin_oidc'): Promise<boolean> {
  try {
    if (provider === 'google' && process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED !== 'true') {
      return false;
    }
    if (provider === 'linkedin_oidc' && process.env.NEXT_PUBLIC_LINKEDIN_OIDC_ENABLED !== 'true') {
      return false;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) return false;
    const res = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '' },
    });
    if (!res.ok) return false;
    const settings = await res.json();
    return settings?.external?.[provider] === true;
  } catch {
    return false;
  }
}

async function startOAuth(
  provider: 'google' | 'linkedin_oidc',
  redirect?: string,
): Promise<OAuthResult> {
  try {
    const enabled = await providerIsEnabled(provider);
    if (!enabled) return { ok: false, error: NOT_CONFIGURED };

    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: buildRedirectTo(redirect), skipBrowserRedirect: true },
    });
    if (error) {
      if (/provider|not enabled|unsupported|disabled/i.test(error.message)) {
        return { ok: false, error: NOT_CONFIGURED };
      }
      return { ok: false, error: error.message };
    }
    if (!data?.url) return { ok: false, error: NOT_CONFIGURED };

    window.location.assign(data.url);
    return { ok: true };
  } catch {
    return { ok: false, error: NOT_CONFIGURED };
  }
}

export function signInWithGoogle(redirect?: string): Promise<OAuthResult> {
  return startOAuth('google', redirect);
}

export function signInWithLinkedIn(redirect?: string): Promise<OAuthResult> {
  return startOAuth('linkedin_oidc', redirect);
}
