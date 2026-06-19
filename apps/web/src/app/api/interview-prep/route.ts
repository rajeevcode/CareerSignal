import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, interviewPrepSessions, newId, toIsoNow } from '@careersignal/db';
import { getSession } from '@/lib/auth/session';
import { getCandidateRowByUserId } from '@/lib/queries';
import { getAiServiceUrl } from '@/lib/utils';
import { getUserPlan, paywallBody } from '@/lib/access';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const candidate = await getCandidateRowByUserId(session.userId);
  if (!candidate) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  // Free plan: 1 interview-prep session as a preview, then Pro.
  if (await getUserPlan(session.userId) === 'free') {
    const count = (await getDb()
      .select()
      .from(interviewPrepSessions)
      .where(eq(interviewPrepSessions.candidateId, candidate.id))).length;
    if (count >= 1) {
      return NextResponse.json(
        paywallBody({ allowed: false, feature: 'interview_prep', reason: 'Interview prep is a CareerSignal Pro feature. Your free preview is used up.' }),
        { status: 402 },
      );
    }
  }

  const body = await request.json().catch(() => ({}));
  const jobId = body.job_id ?? null;

  try {
    const res = await fetch(`${getAiServiceUrl()}/interview-prep/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidate_id: candidate.id, job_id: jobId }),
    });
    if (!res.ok) return NextResponse.json({ error: 'Interview prep failed' }, { status: 500 });

    const prep = await res.json();
    const now = toIsoNow();
    const sessionId = newId();

    await getDb().insert(interviewPrepSessions).values({
      id: sessionId,
      candidateId: candidate.id,
      jobId,
      readinessScore: prep.readiness_score ?? null,
      questionsJson: prep.questions ?? [],
      companySummary: prep.company_summary ?? null,
      plan3090: prep.plan_30_90 ?? null,
      createdAt: now,
    });

    return NextResponse.json({
      session_id: sessionId,
      questions: prep.questions,
      company_summary: prep.company_summary,
      plan_30_90: prep.plan_30_90,
      readiness_score: prep.readiness_score,
    });
  } catch {
    return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 });
  }
}
