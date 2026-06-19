import { NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { getDb, coverLetters, mapCoverLetter, newId, toIsoNow } from '@careersignal/db';
import { getSession } from '@/lib/auth/session';
import { getCandidateRowByUserId } from '@/lib/queries';
import { getPlanStateForUser, gate, paywallBody } from '@/lib/access';
import { getAiServiceUrl } from '@/lib/utils';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const candidate = await getCandidateRowByUserId(session.userId);
  if (!candidate) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const rows = await getDb()
    .select()
    .from(coverLetters)
    .where(eq(coverLetters.candidateId, candidate.id))
    .orderBy(desc(coverLetters.createdAt));

  return NextResponse.json({ letters: rows.map(mapCoverLetter) });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const candidate = await getCandidateRowByUserId(session.userId);
  if (!candidate) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const clGate = gate(await getPlanStateForUser(session.userId), 'cover_letter');
  if (!clGate.allowed) {
    return NextResponse.json(paywallBody(clGate), { status: 402 });
  }

  const body = await request.json();
  if (!body.jd_text?.trim() && !body.job_title?.trim() && !body.job_id) {
    return NextResponse.json({ error: 'Provide a job description, title, or job.' }, { status: 400 });
  }

  try {
    const res = await fetch(`${getAiServiceUrl()}/cover-letter/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidate_id: candidate.id,
        jd_text: body.jd_text ?? null,
        job_id: body.job_id ?? null,
        job_title: body.job_title ?? null,
        company_name: body.company_name ?? null,
        tone: body.tone ?? 'warm',
      }),
    });
    if (!res.ok) return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
    const { content } = await res.json();

    const now = toIsoNow();
    const id = newId();
    await getDb().insert(coverLetters).values({
      id,
      candidateId: candidate.id,
      jobId: body.job_id ?? null,
      content,
      tone: body.tone ?? 'warm',
      createdAt: now,
      updatedAt: now,
    });

    const created = (await getDb().select().from(coverLetters).where(eq(coverLetters.id, id)).limit(1))[0];
    return NextResponse.json({ letter: created ? mapCoverLetter(created) : { content } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 });
  }
}
