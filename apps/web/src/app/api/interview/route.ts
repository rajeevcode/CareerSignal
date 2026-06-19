import { NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import {
  getDb,
  interviewSessions,
  interviewMessages,
  mapInterviewSession,
  newId,
  toIsoNow,
} from '@careersignal/db';
import { getSession } from '@/lib/auth/session';
import { getCandidateRowByUserId } from '@/lib/queries';
import { getUserPlan, paywallBody } from '@/lib/access';
import { getAiServiceUrl } from '@/lib/utils';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const candidate = await getCandidateRowByUserId(session.userId);
  if (!candidate) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const rows = await getDb()
    .select()
    .from(interviewSessions)
    .where(eq(interviewSessions.candidateId, candidate.id))
    .orderBy(desc(interviewSessions.createdAt));

  return NextResponse.json({ sessions: rows.map(mapInterviewSession) });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const candidate = await getCandidateRowByUserId(session.userId);
  if (!candidate) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const db = getDb();

  // Free plan: one mock-interview session as a preview, then Pro.
  if ((await getUserPlan(session.userId)) === 'free') {
    const existing = await db
      .select()
      .from(interviewSessions)
      .where(eq(interviewSessions.candidateId, candidate.id));
    if (existing.length >= 1) {
      return NextResponse.json(
        paywallBody({
          allowed: false,
          feature: 'interview_prep',
          reason: 'Interview Prep Studio is a Pro feature. Your free preview session is used up.',
        }),
        { status: 402 },
      );
    }
  }

  const body = await request.json();
  const roleTitle = (body.role_title || '').trim();
  if (!roleTitle) return NextResponse.json({ error: 'Role title is required' }, { status: 400 });
  const mode = ['behavioral', 'technical', 'company'].includes(body.mode) ? body.mode : 'behavioral';
  const difficulty = ['easy', 'medium', 'hard'].includes(body.difficulty) ? body.difficulty : 'medium';

  try {
    const res = await fetch(`${getAiServiceUrl()}/interview/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidate_id: candidate.id,
        role_title: roleTitle,
        company_name: body.company_name ?? null,
        mode,
        difficulty,
      }),
    });
    if (!res.ok) return NextResponse.json({ error: 'Could not start interview' }, { status: 500 });
    const { question } = await res.json();

    const now = toIsoNow();
    const sessionId = newId();
    await db.insert(interviewSessions).values({
      id: sessionId,
      candidateId: candidate.id,
      roleTitle,
      companyName: body.company_name ?? null,
      mode,
      difficulty,
      createdAt: now,
      updatedAt: now,
    });
    await db.insert(interviewMessages).values({
      id: newId(),
      sessionId,
      turnIndex: 0,
      question,
      createdAt: now,
    });

    return NextResponse.json({ session_id: sessionId }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 });
  }
}
