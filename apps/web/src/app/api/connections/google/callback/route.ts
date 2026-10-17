import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { and, eq, gt } from 'drizzle-orm';
import {
  getDb,
  careerOauthStates,
  careerConnections,
  careerIntegrationItems,
  toIsoNow,
} from '@careersignal/db';
import { getSession } from '@/lib/auth/session';
import { getCandidateRowByUserId } from '@/lib/queries';
import {
  googleConfig,
  googleToken,
  unsealToken,
  sealToken,
  stateHash,
  GOOGLE_SCOPES,
  type ConnectionKind,
} from '@/lib/integrations/google';

export async function GET(request: Request) {
  const target = new URL('/career?tab=connections', request.url);
  const session = await getSession();
  if (!session) return NextResponse.redirect(new URL('/login', request.url));
  const candidate = await getCandidateRowByUserId(session.userId);
  const url = new URL(request.url),
    state = url.searchParams.get('state'),
    code = url.searchParams.get('code'),
    jar = await cookies();
  const saved = jar.get('career-oauth-state')?.value;
  jar.set('career-oauth-state', '', {
    path: '/api/connections/google',
    maxAge: 0,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
  if (
    !candidate ||
    !state ||
    !saved ||
    stateHash(state) !== stateHash(saved) ||
    !code
  ) {
    target.searchParams.set('connection', 'rejected');
    return NextResponse.redirect(target);
  }
  try {
    const [authorization] = await getDb()
      .delete(careerOauthStates)
      .where(
        and(
          eq(careerOauthStates.stateHash, stateHash(state)),
          eq(careerOauthStates.candidateId, candidate.id),
          gt(careerOauthStates.expiresAt, toIsoNow()),
        ),
      )
      .returning();
    if (!authorization) throw new Error('Expired state');
    const kind = authorization.kind as ConnectionKind,
      owner = `${candidate.id}:${kind}`,
      verifier = unsealToken(authorization.verifierCiphertext, owner).verifier;
    if (typeof verifier !== 'string') throw new Error('Missing verifier');
    const token = await googleToken({
      grant_type: 'authorization_code',
      code,
      redirect_uri: googleConfig().redirectUri,
      code_verifier: verifier,
    });
    if (
      typeof token.scope !== 'string' ||
      !token.scope.split(' ').includes(GOOGLE_SCOPES[kind])
    )
      throw new Error('Consent scope missing');
    const scopes = token.scope;
    const ciphertext = sealToken(
      {
        ...token,
        expires_at: Date.now() + Number(token.expires_in ?? 3600) * 1000,
      },
      owner,
    );
    await getDb().transaction(async (tx) => {
      const [connection] = await tx
        .insert(careerConnections)
        .values({
          candidateId: candidate.id,
          kind,
          scopes,
          tokenCiphertext: ciphertext,
        })
        .onConflictDoUpdate({
          target: [careerConnections.candidateId, careerConnections.kind],
          set: {
            tokenCiphertext: ciphertext,
            scopes,
            lastSyncedAt: null,
            updatedAt: toIsoNow(),
          },
        })
        .returning({ id: careerConnections.id });
      // A new consent flow may select a different account. Never mix its records with an old grant.
      await tx
        .delete(careerIntegrationItems)
        .where(
          and(
            eq(careerIntegrationItems.connectionId, connection.id),
            eq(careerIntegrationItems.candidateId, candidate.id),
          ),
        );
    });
    target.searchParams.set('connection', 'connected');
  } catch {
    target.searchParams.set('connection', 'failed');
  }
  return NextResponse.redirect(target);
}
