import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export type PolicySlug = 'copyright' | 'terms' | 'privacy';

export interface PolicyRow {
  slug: string;
  title: string;
  body: string;
  updated_at: string;
}

/** Server-side fetch of an editable policy page from the site_policies table. */
export async function getPolicy(slug: PolicySlug): Promise<PolicyRow | null> {
  const admin = createSupabaseAdminClient();
  // site_policies isn't in the generated Database types; query via an untyped view.
  const { data } = await (admin as unknown as {
    from: (t: string) => {
      select: (c: string) => {
        eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: PolicyRow | null }> };
      };
    };
  })
    .from('site_policies')
    .select('slug,title,body,updated_at')
    .eq('slug', slug)
    .maybeSingle();
  return data ?? null;
}

export function formatUpdated(ts?: string | null): string {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return '';
  }
}
