import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth/token';
import { getOnboardingPath, ONBOARDING_PREFIX, PROTECTED_CANDIDATE_ROUTES } from '@/lib/onboarding';

const PROTECTED = [...PROTECTED_CANDIDATE_ROUTES, '/admin'];

export async function updateSession(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  const pathname = request.nextUrl.pathname;

  const isProtected = PROTECTED.some((p) => pathname.startsWith(p));
  const isOnboarding = pathname.startsWith(ONBOARDING_PREFIX);

  if (isProtected && !session) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith('/admin') && session?.role !== 'admin') {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  if (session?.role === 'candidate') {
    const onboardingComplete = session.onboardingComplete ?? true;
    const onboardingStep = session.onboardingStep ?? 3;

    if (!onboardingComplete && isProtected && !pathname.startsWith('/admin')) {
      const url = request.nextUrl.clone();
      url.pathname = getOnboardingPath(onboardingStep);
      return NextResponse.redirect(url);
    }

    if (onboardingComplete && isOnboarding) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}
