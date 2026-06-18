import { NextResponse } from 'next/server';
import { getDb, companies, newId, toIsoNow } from '@careersignal/db';
import { getSession } from '@/lib/auth/session';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { name, website, industry, location } = await request.json();
  const id = newId();
  const now = toIsoNow();

  getDb().insert(companies).values({
    id,
    name,
    website: website ?? null,
    industry: industry ?? null,
    location: location ?? null,
    verified: true,
    description: null,
    logoUrl: null,
    createdAt: now,
  }).run();

  return NextResponse.json({ id });
}
