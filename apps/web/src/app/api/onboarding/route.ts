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

  if (typeof body.step === 'number') {
    updates.onboardingStep = body.step;
  }
  if (body.career_outcome) updates.careerOutcome = body.career_outcome;
  if (body.target_markets) updates.targetMarkets = body.target_markets;
  if (body.target_roles) updates.targetRoles = body.target_roles;
  if (body.salary_expectation != null) updates.salaryExpectation = body.salary_expectation;
  if (body.notice_period) updates.noticePeriod = body.notice_period;
  if (body.visa_status) updates.visaStatus = body.visa_status;
  if (body.remote_preference) updates.remotePreference = body.remote_preference;
  if (body.relocation_preference) updates.relocationPreference = body.relocation_preference;
  if (body.complete === true) {
    updates.onboardingStep = ONBOARDING_COMPLETE_STEP;
    updates.onboardingComplete = true;
  }

  await db.update(candidateProfiles).set(updates).where(eq(candidateProfiles.userId, session.userId));

  if (body.complete === true) {
    await ensureBatchMatch(profile.id);
  }

  const refreshed = await getSessionPayloadForUser(session.userId, session.email, session.role);
  await setSessionCookie(refreshed);

  return NextResponse.json({ success: true, onboarding_complete: refreshed.onboardingComplete });
}

export async function PATCH(request: Request) {
  return POST(request);
}
