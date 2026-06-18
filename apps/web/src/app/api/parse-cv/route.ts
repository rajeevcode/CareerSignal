import { NextResponse } from 'next/server';
import { getSession, setSessionCookie, getSessionPayloadForUser } from '@/lib/auth/session';
import { getCandidateRowByUserId, setOnboardingStep } from '@/lib/queries';
import { saveUploadedFile } from '@/lib/storage';
import { getAiServiceUrl } from '@/lib/utils';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const candidate = getCandidateRowByUserId(session.userId);
  if (!candidate) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const formData = await request.formData();
  const file = formData.get('file') as File;
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

  const filePath = `${session.userId}/${Date.now()}-${file.name}`;
  const buffer = await file.arrayBuffer();
  await saveUploadedFile(filePath, buffer);

  try {
    const aiForm = new FormData();
    aiForm.append('file', new Blob([buffer], { type: file.type }), file.name);

    const res = await fetch(`${getAiServiceUrl()}/parse-cv?candidate_id=${candidate.id}`, {
      method: 'POST',
      body: aiForm,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({ error: err.detail || 'Parse failed' }, { status: 500 });
    }

    if (!candidate.onboardingComplete) {
      setOnboardingStep(session.userId, 1);
      const refreshed = await getSessionPayloadForUser(session.userId, session.email, session.role);
      await setSessionCookie(refreshed);
    }

    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 });
  }
}
