import { NextResponse } from 'next/server';
import { getSession, setSessionCookie, getSessionPayloadForUser } from '@/lib/auth/session';
import { getCandidateRowByUserId, setOnboardingStep } from '@/lib/queries';
import { saveUploadedFile } from '@/lib/storage';
import { aiFetch } from '@/lib/utils';
import { getPlanStateForUser, gate, paywallBody } from '@/lib/access';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const candidate = await getCandidateRowByUserId(session.userId);
  if (!candidate) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const uploadGate = gate(await getPlanStateForUser(session.userId), 'upload_cv');
  if (!uploadGate.allowed) {
    return NextResponse.json(paywallBody(uploadGate), { status: 402 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File;
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

  const name = file.name.toLowerCase();
  if (!name.endsWith('.pdf') && !name.endsWith('.docx')) {
    return NextResponse.json(
      { error: 'Unsupported file type. Please upload a PDF or DOCX file.' },
      { status: 415 },
    );
  }

  // Sanitize the filename to a storage-safe key (strip anything that isn't a
  // safe path char — also neutralizes XSS-style filenames). Preserve extension.
  const ext = name.endsWith('.docx') ? 'docx' : 'pdf';
  const safeName = `${file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 80) || 'cv'}.${ext}`;
  const filePath = `${session.userId}/${Date.now()}-${safeName}`;
  const buffer = await file.arrayBuffer();
  await saveUploadedFile(filePath, buffer);

  try {
    const aiForm = new FormData();
    aiForm.append('file', new Blob([buffer], { type: file.type }), file.name);

    const res = await aiFetch(
      `/parse-cv?candidate_id=${candidate.id}&file_path=${encodeURIComponent(filePath)}`,
      {
        method: 'POST',
        body: aiForm,
      },
    );

    if (!res.ok) {
      // 402 = atomic upload-cap backstop (a concurrent upload slipped past the
      // app-level gate). Return the same paywall body shape.
      if (res.status === 402) {
        return NextResponse.json(
          { error: "You've used all 3 free CV uploads.", upgrade: true, feature: 'upload_cv' },
          { status: 402 },
        );
      }
      const err = await res.json().catch(() => ({}));
      const status = res.status === 415 || res.status === 400 ? res.status : 500;
      return NextResponse.json({ error: err.detail || 'Parse failed' }, { status });
    }

    if (!candidate.onboardingComplete) {
      await setOnboardingStep(session.userId, 1);
      const refreshed = await getSessionPayloadForUser(session.userId, session.email, session.role);
      await setSessionCookie(refreshed);
    }

    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 });
  }
}
