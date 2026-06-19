import { NextResponse } from 'next/server';
import { eq, and, desc } from 'drizzle-orm';
import { getDb, cvVersions, newId, toIsoNow } from '@careersignal/db';
import { getSession } from '@/lib/auth/session';
import { getCandidateRowByUserId } from '@/lib/queries';
import { getPlanStateForUser, gate, paywallBody } from '@/lib/access';

function mapCvVersion(row: typeof cvVersions.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    content: row.contentJson ?? {},
    target_role: row.targetRole,
    target_market: row.targetMarket,
    cv_score: row.cvScore,
    is_primary: row.isPrimary,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const candidate = await getCandidateRowByUserId(session.userId);
  if (!candidate) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const rows = await getDb().select().from(cvVersions)
    .where(eq(cvVersions.candidateId, candidate.id))
    .orderBy(desc(cvVersions.updatedAt));

  return NextResponse.json({ versions: rows.map(mapCvVersion) });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const candidate = await getCandidateRowByUserId(session.userId);
  if (!candidate) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const body = await request.json();
  const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  const db = getDb();
  const now = toIsoNow();
  const contentJson = body.content_json ?? body.content ?? {};
  const isPrimary = Boolean(body.is_primary);

  if (isPrimary) {
    await db.update(cvVersions)
      .set({ isPrimary: false })
      .where(eq(cvVersions.candidateId, candidate.id));
  }

  if (body.id) {
    const existing = (await db.select().from(cvVersions)
      .where(and(eq(cvVersions.id, body.id), eq(cvVersions.candidateId, candidate.id)))
      .limit(1))[0];

    if (!existing) return NextResponse.json({ error: 'CV version not found' }, { status: 404 });

    await db.update(cvVersions).set({
      name,
      contentJson,
      targetRole: body.target_role ?? existing.targetRole,
      targetMarket: body.target_market ?? existing.targetMarket,
      cvScore: body.cv_score ?? existing.cvScore,
      isPrimary: isPrimary || existing.isPrimary,
      updatedAt: now,
    }).where(eq(cvVersions.id, body.id));

    const updated = (await db.select().from(cvVersions).where(eq(cvVersions.id, body.id)).limit(1))[0];
    return NextResponse.json({ version: updated ? mapCvVersion(updated) : null });
  }

  // Creating a NEW version (no body.id) is gated for Free (1 active version).
  const createGate = gate(await getPlanStateForUser(session.userId), 'create_cv_version');
  if (!createGate.allowed) {
    return NextResponse.json(paywallBody(createGate), { status: 402 });
  }

  const id = newId();
  await db.insert(cvVersions).values({
    id,
    candidateId: candidate.id,
    name,
    contentJson,
    targetRole: body.target_role ?? null,
    targetMarket: body.target_market ?? null,
    cvScore: body.cv_score ?? null,
    isPrimary,
    createdAt: now,
    updatedAt: now,
  });

  const created = (await db.select().from(cvVersions).where(eq(cvVersions.id, id)).limit(1))[0];
  return NextResponse.json({ version: created ? mapCvVersion(created) : null }, { status: 201 });
}
