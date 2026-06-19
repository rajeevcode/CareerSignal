'use client';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export type OAuthResult = { ok: boolean; error?: string };

/** Friendly message when a provider isn't enabled in Supabase yet. */
const NOT_CONFIGURED = "Social login isn't set up yet. Please use email instead.";

function buildRedirectTo(redirect?: string): string {
  const dest = redirect && redirect.startsWith('/') ? redirect : '/dashboard';
  return `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(dest)}`;
}

async function startOAuth(
  provider: 'google' | 'linkedin_oidc',
  redirect?: string,
): Promise<OAuthResult> {
  try {
    const supabase = createSupabaseBrowserClient();
    // skipBrowserRedirect: build the authorize URL but don't navigate yet, so we
    // can probe it first. A disabled provider returns 400 from /authorize — without
    // this we'd hard-navigate the tab to that 400 page instead of showing a message.
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

    // Probe the authorize endpoint. If the provider is disabled it 400s; the IdP
    // redirect (302) is opaque under no-cors, which is the success signal here.
    try {
      const probe = await fetch(data.url, { method: 'GET', redirect: 'manual' });
      // status 0 = opaqueredirect (provider enabled → off to the IdP). 4xx = disabled.
      if (probe.status >= 400) return { ok: false, error: NOT_CONFIGURED };
    } catch {
      // Network/CORS quirk — fall through and let the real navigation try.
    }

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
