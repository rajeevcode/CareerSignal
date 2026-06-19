import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { getDb, savedJobs, newId, toIsoNow } from '@careersignal/db';
import { getSession } from '@/lib/auth/session';
import { getCandidateRowByUserId } from '@/lib/queries';
import { getPlanStateForUser, gate, paywallBody } from '@/lib/access';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { job_id, unsave } = await request.json();
  const candidate = await getCandidateRowByUserId(session.userId);
  if (!candidate) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const db = getDb();
  const existing = (await db.select().from(savedJobs)
    .where(and(eq(savedJobs.candidateId, candidate.id), eq(savedJobs.jobId, job_id)))
    .limit(1))[0];

  if (unsave) {
    if (existing) {
      await db.delete(savedJobs).where(eq(savedJobs.id, existing.id));
    }
  } else if (!existing) {
    const planState = await getPlanStateForUser(session.userId);
    const allowed = gate(planState, 'save_job');
    if (!allowed.allowed) {
      return NextResponse.json(paywallBody(allowed), { status: 402 });
    }
    await db.insert(savedJobs).values({
      id: newId(),
      candidateId: candidate.id,
      jobId: job_id,
      createdAt: toIsoNow(),
    });
  }

  return NextResponse.json({ success: true });
}
