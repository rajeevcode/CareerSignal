import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getCandidateRowByUserId } from '@/lib/queries';
import { getAiServiceUrl } from '@/lib/utils';

// ATS check basic report is free (deterministic + cheap). The UI gates the full
// checklist behind Pro.
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const candidate = await getCandidateRowByUserId(session.userId);
  if (!candidate) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const body = await request.json().catch(() => ({}));

  try {
    const res = await fetch(`${getAiServiceUrl()}/ats-check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidate_id: candidate.id,
        jd_text: body.jd_text ?? null,
        target_role: body.target_role ?? null,
      }),
    });
    if (res.status === 400) {
      return NextResponse.json({ error: 'No CV found. Upload a CV first.' }, { status: 400 });
    }
    if (!res.ok) return NextResponse.json({ error: 'ATS check failed' }, { status: 500 });
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 });
  }
}
