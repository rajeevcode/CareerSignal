import { NextResponse } from 'next/server';
import { eq, and, desc } from 'drizzle-orm';
import { getDb, cvVersions } from '@careersignal/db';
import { getSession, getCurrentUser } from '@/lib/auth/session';
import { getCandidateRowByUserId } from '@/lib/queries';
import { getPlanStateForUser, gate, paywallBody } from '@/lib/access';

// @react-pdf/renderer must run in Node (not edge).
export const runtime = 'nodejs';

interface CvContent {
  summary?: string;
  experience?: string[];
  skills?: string[];
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const candidate = await getCandidateRowByUserId(session.userId);
  if (!candidate) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const exportGate = gate(await getPlanStateForUser(session.userId), 'export_cv');
  if (!exportGate.allowed) {
    return NextResponse.json(paywallBody(exportGate), { status: 402 });
  }

  const body = await request.json().catch(() => ({}));
  const db = getDb();

  // Use the requested version, or the candidate's most recent.
  let version = null as null | typeof cvVersions.$inferSelect;
  if (body.versionId) {
    version = (
      await db
        .select()
        .from(cvVersions)
        .where(and(eq(cvVersions.id, body.versionId), eq(cvVersions.candidateId, candidate.id)))
        .limit(1)
    )[0] ?? null;
  } else {
    version = (
      await db
        .select()
        .from(cvVersions)
        .where(eq(cvVersions.candidateId, candidate.id))
        .orderBy(desc(cvVersions.updatedAt))
        .limit(1)
    )[0] ?? null;
  }

  if (!version) {
    return NextResponse.json({ error: 'No CV version to export. Create one in the CV Builder.' }, { status: 404 });
  }

  const content = (version.contentJson ?? {}) as CvContent;
  const user = await getCurrentUser();

  // Dynamic import keeps @react-pdf/renderer out of the client/edge bundle.
  const { renderToBuffer, Document, Page, Text, View, StyleSheet } = await import('@react-pdf/renderer');
  const React = (await import('react')).default;

  const styles = StyleSheet.create({
    page: { padding: 40, fontSize: 11, color: '#1e293b', lineHeight: 1.4 },
    name: { fontSize: 22, fontWeight: 700, marginBottom: 2, color: '#0f172a' },
    role: { fontSize: 12, color: '#475569', marginBottom: 12 },
    section: { fontSize: 13, fontWeight: 700, marginTop: 14, marginBottom: 6, color: '#312e81' },
    bullet: { marginBottom: 4 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
    chip: { fontSize: 10, backgroundColor: '#eef2ff', color: '#3730a3', paddingVertical: 2, paddingHorizontal: 6, borderRadius: 4, marginRight: 4, marginBottom: 4 },
  });

  const h = React.createElement;
  const doc = h(
    Document,
    {},
    h(
      Page,
      { size: 'A4', style: styles.page },
      h(Text, { style: styles.name }, user?.full_name || 'Your Name'),
      h(Text, { style: styles.role }, version.targetRole || candidate.currentTitle || ''),
      content.summary ? h(Text, { style: styles.section }, 'Summary') : null,
      content.summary ? h(Text, {}, content.summary) : null,
      content.experience && content.experience.length ? h(Text, { style: styles.section }, 'Experience') : null,
      ...(content.experience || []).map((b, i) => h(Text, { key: `e${i}`, style: styles.bullet }, `• ${b}`)),
      content.skills && content.skills.length ? h(Text, { style: styles.section }, 'Skills') : null,
      content.skills && content.skills.length
        ? h(View, { style: styles.chipRow }, ...content.skills.map((s, i) => h(Text, { key: `s${i}`, style: styles.chip }, s)))
        : null,
    ),
  );

  const buffer = await renderToBuffer(doc);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${(version.name || 'cv').replace(/[^a-z0-9]+/gi, '_')}.pdf"`,
    },
  });
}
