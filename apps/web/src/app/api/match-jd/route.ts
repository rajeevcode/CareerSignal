import { randomUUID } from 'node:crypto';
import { beginJdRequest, finishJdRequest } from '@/lib/jd-request-ledger';
import { NextResponse } from 'next/server';
import { FREE_LIMITS } from '@/lib/billing';
import { getSession } from '@/lib/auth/session';
import { getCandidateRowByUserId } from '@/lib/queries';
import { aiFetch } from '@/lib/utils';
import { getUserPlan } from '@/lib/access';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const candidate = await getCandidateRowByUserId(session.userId);
  if (!candidate) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    const value: unknown = await request.json();
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid body');
    body = value as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (body.candidate_id && body.candidate_id !== candidate.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (typeof body.jd_text !== 'string' || !body.jd_text.trim() || body.jd_text.length > 50_000) {
    return NextResponse.json({ error: 'Job description must contain 1–50,000 characters' }, { status: 400 });
  }

  const key=request.headers.get('Idempotency-Key') ?? randomUUID();
  if(!/^[A-Za-z0-9_-]{8,128}$/.test(key)) return NextResponse.json({error:'Invalid idempotency key'},{status:400});
  let requestId:string|null=null;
  let succeeded=false;
  try {
    const started=await beginJdRequest(session.userId,candidate.id,key,{jd_text:body.jd_text,job_title:body.job_title??null},await getUserPlan(session.userId)==='pro');
    switch(started.kind) {
      case 'cached': return NextResponse.json(started.data);
      case 'pending': return NextResponse.json({error:'This analysis is still processing. Retry shortly with the same request.'},{status:202,headers:{'Retry-After':'5'}});
      case 'conflict': return NextResponse.json({error:'Request key belongs to different input.'},{status:409});
      case 'failed': return NextResponse.json({error:'This attempt failed. Start a new analysis.'},{status:409});
      case 'denied': return NextResponse.json({error:`You've used your ${FREE_LIMITS.jdMatchesMonthly} free JD matches this month.`,upgrade:true,feature:'jd_match'},{status:402});
      case 'started': requestId=started.id;
    }
    const res = await aiFetch(`/match/jd`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidate_id: candidate.id,
        jd_text: body.jd_text,
        job_title: typeof body.job_title === 'string' ? body.job_title.slice(0, 300) : undefined,
      }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) return NextResponse.json({ error: 'Match failed' }, { status: 500 });
    const data = await res.json();
    succeeded = await finishJdRequest(requestId, true, data);
    if (!succeeded) return NextResponse.json({error:'Analysis reservation expired. Please retry.'},{status:409});
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 });
  } finally {
    if (requestId && !succeeded) {
      try { await finishJdRequest(requestId,false); }
      catch { console.error('[match-jd] Failed to close request; maintenance will reconcile it'); }
    }
  }
}
