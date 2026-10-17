import { randomBytes, createHash } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getDb, careerOauthStates } from '@careersignal/db';
import { getSession } from '@/lib/auth/session';
import { getCandidateRowByUserId } from '@/lib/queries';
import {
  GOOGLE_SCOPES,
  googleConfig,
  sealToken,
  stateHash,
  type ConnectionKind,
} from '@/lib/integrations/google';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const candidate = await getCandidateRowByUserId(session.userId);
  if (!candidate)
    return NextResponse.json({ error: 'Profile missing' }, { status: 404 });
  const body = await request.json().catch(() => null);
  if (
    !body ||
    !['inbox', 'calendar'].includes(body.kind) ||
    body.consent !== true
  )
    return NextResponse.json(
      { error: 'Explicit connection consent is required' },
      { status: 400 },
    );
  try {
    const kind = body.kind as ConnectionKind,
      config = googleConfig(),
      state = randomBytes(32).toString('base64url'),
      verifier = randomBytes(32).toString('base64url');
    await getDb()
      .insert(careerOauthStates)
      .values({
        stateHash: stateHash(state),
        candidateId: candidate.id,
        kind,
        verifierCiphertext: sealToken({ verifier }, `${candidate.id}:${kind}`),
        expiresAt: new Date(Date.now() + 600_000).toISOString(),
      });
    (await cookies()).set('career-oauth-state', state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 600,
      path: '/api/connections/google',
    });
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.search = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: GOOGLE_SCOPES[kind],
      state,
      access_type: 'offline',
      prompt: 'consent',
      code_challenge: createHash('sha256').update(verifier).digest('base64url'),
      code_challenge_method: 'S256',
    }).toString();
    return NextResponse.json({ url: url.toString() });
  } catch {
    return NextResponse.json(
      {
        error:
          'Google connection is not configured. Set the OAuth credentials and encryption key on the server.',
      },
      { status: 503 },
    );
  }
}
