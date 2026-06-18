import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getCandidateRowByUserId } from '@/lib/queries';
import { getAiServiceUrl } from '@/lib/utils';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const candidate = getCandidateRowByUserId(session.userId);
  if (!candidate) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const body = await request.json();
  if (body.candidate_id && body.candidate_id !== candidate.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!body.jd_text?.trim()) {
    return NextResponse.json({ error: 'Job description required' }, { status: 400 });
  }

  try {
    const res = await fetch(`${getAiServiceUrl()}/match/jd`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidate_id: candidate.id,
        jd_text: body.jd_text,
        job_title: body.job_title,
      }),
    });
    if (!res.ok) return NextResponse.json({ error: 'Match failed' }, { status: 500 });
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 });
  }
}
