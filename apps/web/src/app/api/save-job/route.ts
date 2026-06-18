import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { getDb, savedJobs, newId, toIsoNow } from '@careersignal/db';
import { getSession } from '@/lib/auth/session';
import { getCandidateRowByUserId } from '@/lib/queries';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { job_id, unsave } = await request.json();
  const candidate = getCandidateRowByUserId(session.userId);
  if (!candidate) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const db = getDb();
  const existing = db.select().from(savedJobs)
    .where(and(eq(savedJobs.candidateId, candidate.id), eq(savedJobs.jobId, job_id)))
    .get();

  if (unsave) {
    if (existing) {
      db.delete(savedJobs).where(eq(savedJobs.id, existing.id)).run();
    }
  } else if (!existing) {
    db.insert(savedJobs).values({
      id: newId(),
      candidateId: candidate.id,
      jobId: job_id,
      createdAt: toIsoNow(),
    }).run();
  }

  return NextResponse.json({ success: true });
}
