import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { PROTECTED_CANDIDATE_ROUTES } from '@/lib/onboarding';

const PROTECTED = [...PROTECTED_CANDIDATE_ROUTES, '/admin', '/recruiter'];

/**
 * Refreshes the Supabase auth session on every request and enforces
 * route protection + role gates. Role/onboarding fine-grained gating also
 * happens in the (app) layout server component via getSession().
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // IMPORTANT: getUser() refreshes the token cookie via setAll above.
  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;
  // Match on a path-segment boundary so e.g. '/cv' does NOT also protect the
  // public '/cv-score' marketing page (substring prefix would be a false match).
  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(p + '/'));

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // Role gates for /recruiter and /admin (role lives in profiles).
  if (user && (pathname.startsWith('/recruiter') || pathname.startsWith('/admin'))) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    const role = profile?.role ?? 'candidate';

    if (pathname.startsWith('/recruiter') && role !== 'recruiter' && role !== 'admin') {
      const url = request.nextUrl.clone();
      url.pathname = '/restricted';
      url.search = '?area=recruiter';
      return NextResponse.redirect(url);
    }
    if (pathname.startsWith('/admin') && role !== 'admin') {
      const url = request.nextUrl.clone();
      url.pathname = '/restricted';
      url.search = '?area=admin';
      return NextResponse.redirect(url);
    }
  }

  return response;
}
