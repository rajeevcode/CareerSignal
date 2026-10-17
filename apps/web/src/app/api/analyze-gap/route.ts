import { canAccessJob } from '@/lib/job-access';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getCandidateRowByUserId } from '@/lib/queries';
import { aiFetch } from '@/lib/utils';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { candidate_id, job_id, role_style } = await request.json();
  const candidate = await getCandidateRowByUserId(session.userId);
  if (!candidate || candidate.id !== candidate_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!(await canAccessJob(candidate.id, job_id)))
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });

  try {
    const res = await aiFetch(`/analyze-gap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidate_id,
        job_id,
        role_style: role_style || 'ai_product_manager',
      }),
    });
    if (!res.ok) throw new Error('Analysis failed');
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json(
      { error: 'AI service unavailable' },
      { status: 503 },
    );
  }
}
