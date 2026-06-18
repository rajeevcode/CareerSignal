import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, candidateProfiles, toIsoNow } from '@careersignal/db';
import { getSession, setSessionCookie, getSessionPayloadForUser } from '@/lib/auth/session';
import { ensureBatchMatch } from '@/lib/matching';

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const db = getDb();
  const profile = db.select().from(candidateProfiles).where(eq(candidateProfiles.userId, session.userId)).get();
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const now = toIsoNow();
  const updates: Partial<typeof candidateProfiles.$inferInsert> = { updatedAt: now };

  if (typeof body.onboarding_step === 'number') {
    updates.onboardingStep = body.onboarding_step;
  }

  if (body.complete === true) {
    updates.onboardingStep = 3;
    updates.onboardingComplete = true;
  }

  if (body.profile) {
    const p = body.profile;
    if (p.current_title !== undefined) updates.currentTitle = p.current_title;
    if (p.location !== undefined) updates.location = p.location;
    if (p.total_experience_years !== undefined) updates.totalExperienceYears = p.total_experience_years;
    if (p.profile_summary !== undefined) updates.profileSummary = p.profile_summary;
    if (body.onboarding_step === undefined && !body.complete) {
      updates.onboardingStep = Math.max(profile.onboardingStep ?? 0, 2);
    }
  }

  db.update(candidateProfiles).set(updates).where(eq(candidateProfiles.userId, session.userId)).run();

  if (body.complete === true) {
    await ensureBatchMatch(profile.id);
  }

  const refreshed = await getSessionPayloadForUser(session.userId, session.email, session.role);
  await setSessionCookie(refreshed);

  return NextResponse.json({
    success: true,
    onboarding_complete: refreshed.onboardingComplete,
    onboarding_step: refreshed.onboardingStep,
  });
}
