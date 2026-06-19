import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, coachMessages, newId, toIsoNow } from '@careersignal/db';
import { getSession } from '@/lib/auth/session';
import { getCandidateRowByUserId } from '@/lib/queries';
import { getAiServiceUrl } from '@/lib/utils';
import { getPlanStateForUser, gate, paywallBody } from '@/lib/access';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const candidate = await getCandidateRowByUserId(session.userId);
  if (!candidate) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const coachGate = gate(await getPlanStateForUser(session.userId), 'career_coach');
  if (!coachGate.allowed) {
    return NextResponse.json(paywallBody(coachGate), { status: 402 });
  }

  const { message } = await request.json();
  if (!message || typeof message !== 'string' || !message.trim()) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  try {
    const res = await fetch(`${getAiServiceUrl()}/coach/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidate_id: candidate.id, message: message.trim() }),
    });
    if (!res.ok) return NextResponse.json({ error: 'Coach request failed' }, { status: 500 });

    const { response } = await res.json();
    const now = toIsoNow();
    const db = getDb();

    await db.insert(coachMessages).values({
      id: newId(),
      candidateId: candidate.id,
      role: 'user',
      content: message.trim(),
      createdAt: now,
    });

    await db.insert(coachMessages).values({
      id: newId(),
      candidateId: candidate.id,
      role: 'assistant',
      content: response,
      createdAt: now,
    });

    return NextResponse.json({ response });
  } catch {
    return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 });
  }
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const candidate = await getCandidateRowByUserId(session.userId);
  if (!candidate) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const db = getDb();
  const messages = (await db.select().from(coachMessages)
    .where(eq(coachMessages.candidateId, candidate.id))
    .orderBy(coachMessages.createdAt))
    .map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      created_at: m.createdAt,
    }));

  return NextResponse.json({ messages });
}
