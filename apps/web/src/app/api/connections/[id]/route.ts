import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getDb, careerConnections } from '@careersignal/db';
import { getSession } from '@/lib/auth/session';
import { getCandidateRowByUserId } from '@/lib/queries';
import { syncGoogleConnection, unsealToken } from '@/lib/integrations/google';
async function owner() {
  const session = await getSession();
  return session ? getCandidateRowByUserId(session.userId) : null;
}
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const candidate = await owner();
  if (!candidate)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    return NextResponse.json(
      await syncGoogleConnection(candidate.id, (await params).id),
    );
  } catch {
    return NextResponse.json(
      {
        error:
          'Sync unavailable. Check the connection, reconnect if needed, and retry.',
      },
      { status: 503 },
    );
  }
}
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const candidate = await owner();
  if (!candidate)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const [row] = await getDb()
    .delete(careerConnections)
    .where(
      and(
        eq(careerConnections.candidateId, candidate.id),
        eq(careerConnections.id, (await params).id),
      ),
    )
    .returning();
  // Delete local credentials and imported records even if provider revocation is offline.
  let revoked = false;
  if (row)
    try {
      const token = unsealToken(
        row.tokenCiphertext,
        `${candidate.id}:${row.kind}`,
      );
      const value = token.refresh_token ?? token.access_token;
      if (typeof value === 'string') {
        const response = await fetch('https://oauth2.googleapis.com/revoke', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ token: value }),
          signal: AbortSignal.timeout(10_000),
        });
        revoked = response.ok;
      }
    } catch {
      revoked = false;
    }
  return NextResponse.json({ disconnected: true, providerRevoked: revoked });
}
