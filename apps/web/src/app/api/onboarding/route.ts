import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, candidateProfiles, toIsoNow } from '@careersignal/db';
import { getSession, setSessionCookie, getSessionPayloadForUser } from '@/lib/auth/session';
import { ensureBatchMatch } from '@/lib/matching';
import { ONBOARDING_COMPLETE_STEP } from '@/lib/onboarding';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const db = getDb();
  const profile = (await db.select().from(candidateProfiles).where(eq(candidateProfiles.userId, session.userId)).limit(1))[0];
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const now = toIsoNow();
  const updates: Partial<typeof candidateProfiles.$inferInsert> = { updatedAt: now };

  // Validate each field's shape before persisting — these come straight from
  // the client, and target_roles/target_markets are NOT NULL text[] columns.
  const isStringArray = (v: unknown): v is string[] =>
    Array.isArray(v) && v.every((x) => typeof x === 'string');
  const asString = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);

  if (typeof body.step === 'number' && Number.isInteger(body.step)) {
    updates.onboardingStep = body.step;
  }
  if (asString(body.career_outcome) !== undefined) updates.careerOutcome = body.career_outcome;
  if (isStringArray(body.target_markets)) updates.targetMarkets = body.target_markets;
  if (isStringArray(body.target_roles)) updates.targetRoles = body.target_roles;
  if (typeof body.salary_expectation === 'number') updates.salaryExpectation = body.salary_expectation;
  if (asString(body.notice_period) !== undefined) updates.noticePeriod = body.notice_period;
  if (asString(body.visa_status) !== undefined) updates.visaStatus = body.visa_status;
  if (asString(body.remote_preference) !== undefined) updates.remotePreference = body.remote_preference;
  if (asString(body.relocation_preference) !== undefined) updates.relocationPreference = body.relocation_preference;

  // Completion is DERIVED from real state, not trusted from the client: the
  // candidate must have a scored CV and at least one target role. (Mirrors the
  // lazy-completion logic in the session adapter.) The client's `complete` flag
  // only requests the check; it can't self-mark onboarding done.
  const effectiveRoles = updates.targetRoles ?? profile.targetRoles ?? [];
  const wantsComplete = body.complete === true;
  const meetsBar = profile.cvScore != null && Array.isArray(effectiveRoles) && effectiveRoles.length > 0;
  const willComplete = wantsComplete && meetsBar;
  if (willComplete) {
    updates.onboardingStep = ONBOARDING_COMPLETE_STEP;
    updates.onboardingComplete = true;
  }

  await db.update(candidateProfiles).set(updates).where(eq(candidateProfiles.userId, session.userId));

  if (willComplete) {
    await ensureBatchMatch(profile.id);
  }

  const refreshed = await getSessionPayloadForUser(session.userId, session.email, session.role);
  await setSessionCookie(refreshed);

  return NextResponse.json({ success: true, onboarding_complete: refreshed.onboardingComplete });
}

export async function PATCH(request: Request) {
  return POST(request);
}
