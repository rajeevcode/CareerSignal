import { NextResponse } from 'next/server';
import { eq, and, asc } from 'drizzle-orm';
import {
  getDb,
  interviewSessions,
  interviewMessages,
  candidateProfiles,
  mapInterviewSession,
  mapInterviewMessage,
  newId,
  toIsoNow,
} from '@careersignal/db';
import { getSession } from '@/lib/auth/session';
import { getCandidateRowByUserId } from '@/lib/queries';
import { getAiServiceUrl } from '@/lib/utils';

const TOTAL_TURNS = 5;

async function ownSession(userId: string, sessionId: string) {
  const db = getDb();
  const candidate = await getCandidateRowByUserId(userId);
  if (!candidate) return null;
  const s = (
    await db
      .select()
      .from(interviewSessions)
      .where(and(eq(interviewSessions.id, sessionId), eq(interviewSessions.candidateId, candidate.id)))
      .limit(1)
  )[0];
  return s ?? null;
}

export async function GET(_req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { sessionId } = await params;

  const s = await ownSession(session.userId, sessionId);
  if (!s) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  const messages = await getDb()
    .select()
    .from(interviewMessages)
    .where(eq(interviewMessages.sessionId, sessionId))
    .orderBy(asc(interviewMessages.turnIndex));

  return NextResponse.json({ session: mapInterviewSession(s), messages: messages.map(mapInterviewMessage) });
}

export async function POST(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { sessionId } = await params;

  const s = await ownSession(session.userId, sessionId);
  if (!s) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  const { answer } = await request.json();
  if (!answer?.trim()) return NextResponse.json({ error: 'Answer is required' }, { status: 400 });

  const db = getDb();
  const messages = await db
    .select()
    .from(interviewMessages)
    .where(eq(interviewMessages.sessionId, sessionId))
    .orderBy(asc(interviewMessages.turnIndex));

  // The current (unanswered) turn is the last message without an answer.
  const current = [...messages].reverse().find((m) => !m.answer);
  if (!current) return NextResponse.json({ error: 'No open question' }, { status: 400 });

  const ai = getAiServiceUrl();

  // 1) Score the answer (STAR).
  let feedback: unknown = null;
  let score: number | null = null;
  try {
    const scoreRes = await fetch(`${ai}/interview/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role_title: s.roleTitle, mode: s.mode, question: current.question, answer }),
    });
    if (scoreRes.ok) {
      const data = await scoreRes.json();
      score = typeof data.score === 'number' ? data.score : null;
      feedback = { strengths: data.strengths ?? [], improvements: data.improvements ?? [], star: data.star ?? {} };
    }
  } catch {
    /* fall through — store answer without a score */
  }

  await db
    .update(interviewMessages)
    .set({ answer, score, feedbackJson: feedback })
    .where(eq(interviewMessages.id, current.id));

  const answeredCount = messages.filter((m) => m.answer).length + 1;
  const askedQuestions = messages.map((m) => m.question);

  // 2) Either ask the next question or finalize the session.
  if (answeredCount >= TOTAL_TURNS) {
    const scores = messages.map((m) => m.score).filter((v): v is number => typeof v === 'number');
    if (typeof score === 'number') scores.push(score);
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    let summary = '';
    try {
      const qa = messages.map((m) => ({ question: m.question, answer: m.answer || '' }));
      qa.push({ question: current.question, answer });
      const sumRes = await fetch(`${ai}/interview/summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_title: s.roleTitle, qa_pairs: qa, avg_score: avg }),
      });
      if (sumRes.ok) summary = (await sumRes.json()).summary || '';
    } catch {
      /* summary optional */
    }

    await db
      .update(interviewSessions)
      .set({ overallScore: Math.round(avg), summary, updatedAt: toIsoNow() })
      .where(eq(interviewSessions.id, sessionId));

    return NextResponse.json({ done: true, overall_score: Math.round(avg), summary, feedback, score });
  }

  // Next question.
  let nextQuestion: string | null = null;
  try {
    const nextRes = await fetch(`${ai}/interview/next`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role_title: s.roleTitle,
        mode: s.mode,
        difficulty: s.difficulty,
        asked_questions: askedQuestions,
      }),
    });
    if (nextRes.ok) nextQuestion = (await nextRes.json()).question;
  } catch {
    /* handled below */
  }

  if (nextQuestion) {
    await db.insert(interviewMessages).values({
      id: newId(),
      sessionId,
      turnIndex: current.turnIndex + 1,
      question: nextQuestion,
      createdAt: toIsoNow(),
    });
  }

  return NextResponse.json({ done: false, next_question: nextQuestion, feedback, score });
}
