import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { aiFetch } from '@/lib/utils';
import { getPlanStateForUser, gate, paywallBody } from '@/lib/access';

const MODES = ['regenerate', 'senior', 'concise'];

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rewriteGate = gate(await getPlanStateForUser(session.userId), 'cv_rewrite');
  if (!rewriteGate.allowed) {
    return NextResponse.json(paywallBody(rewriteGate), { status: 402 });
  }

  const body = await request.json();
  const bullet = typeof body.bullet === 'string' ? body.bullet.trim() : '';
  const mode = typeof body.mode === 'string' ? body.mode : 'regenerate';

  if (!bullet) {
    return NextResponse.json({ error: 'Bullet text is required' }, { status: 400 });
  }
  if (!MODES.includes(mode)) {
    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
  }

  try {
    const res = await aiFetch(`/rewrite-bullet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bullet: bullet.slice(0, 600),
        job_id: body.job_id ?? null,
        job_title: body.job_title ?? null,
        required_skills: Array.isArray(body.required_skills) ? body.required_skills : [],
        role_style: body.role_style || 'ai_product_manager',
        mode,
      }),
    });
    if (!res.ok) throw new Error('Rewrite failed');
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 });
  }
}
