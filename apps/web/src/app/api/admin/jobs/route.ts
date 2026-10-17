import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { aiFetchBestEffort } from '@/lib/utils';
import { getDb, jobs, newId, toIsoNow } from '@careersignal/db';

async function requireAdmin() {
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (session.role !== 'admin') return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return { session };
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;

  const body = await request.json();
  const db = getDb();
  const now = toIsoNow();
  const id = newId();

  await db.insert(jobs).values({
    id,
    companyId: body.company_id,
    title: body.title,
    description: body.description,
    location: body.location ?? null,
    remoteType: body.remote_type ?? 'onsite',
    salaryMin: body.salary_min ?? null,
    salaryMax: body.salary_max ?? null,
    salaryCurrency: body.salary_currency ?? 'INR',
    experienceMin: body.experience_min ?? null,
    experienceMax: body.experience_max ?? null,
    requiredSkills: body.required_skills ?? [],
    niceToHaveSkills: body.nice_to_have_skills ?? [],
    employmentType: body.employment_type ?? 'full_time',
    visaSponsorship: Boolean(body.visa_sponsorship),
    functionTag: body.function_tag ?? null,
    techStack: body.tech_stack ?? [],
    status: body.status ?? 'published',
    sourceUrl: null,
    externalId: null,
    applicantCount: 0,
    postedAt: now,
    createdAt: now,
    updatedAt: now,
  });

  // Embedding is optional at create time; aiFetchBestEffort never throws but
  // logs token-drift / failures instead of swallowing them silently.
  await aiFetchBestEffort(`/parse-job`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job_id: id }),
  });

  return NextResponse.json({ id });
}
