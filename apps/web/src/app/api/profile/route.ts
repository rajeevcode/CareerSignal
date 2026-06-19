import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, candidateProfiles, toIsoNow } from '@careersignal/db';
import { getSession } from '@/lib/auth/session';

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const db = getDb();

  const updates: Record<string, unknown> = { updatedAt: toIsoNow() };
  if (body.current_title !== undefined) updates.currentTitle = body.current_title;
  if (body.location !== undefined) updates.location = body.location;
  if (body.total_experience_years !== undefined) updates.totalExperienceYears = body.total_experience_years;
  if (body.salary_expectation !== undefined) updates.salaryExpectation = body.salary_expectation;
  if (body.notice_period !== undefined) updates.noticePeriod = body.notice_period;
  if (body.visa_status !== undefined) updates.visaStatus = body.visa_status;
  if (body.remote_preference !== undefined) updates.remotePreference = body.remote_preference;
  if (body.target_roles !== undefined) updates.targetRoles = body.target_roles || [];
  if (body.profile_summary !== undefined) updates.profileSummary = body.profile_summary;
  if (body.linkedin_url !== undefined) updates.linkedinUrl = body.linkedin_url;
  if (body.github_url !== undefined) updates.githubUrl = body.github_url;
  if (body.portfolio_url !== undefined) updates.portfolioUrl = body.portfolio_url;

  await db.update(candidateProfiles).set(updates).where(eq(candidateProfiles.userId, session.userId));

  return NextResponse.json({ success: true });
}
