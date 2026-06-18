import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getAiServiceUrl } from '@/lib/utils';
import { getDb, jobs, companies, newId, toIsoNow } from '@careersignal/db';

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

  db.insert(jobs).values({
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
    requiredSkills: JSON.stringify(body.required_skills ?? []),
    niceToHaveSkills: JSON.stringify(body.nice_to_have_skills ?? []),
    employmentType: body.employment_type ?? 'full_time',
    visaSponsorship: Boolean(body.visa_sponsorship),
    functionTag: body.function_tag ?? null,
    techStack: JSON.stringify(body.tech_stack ?? []),
    status: body.status ?? 'published',
    sourceUrl: null,
    externalId: null,
    applicantCount: 0,
    embedding: null,
    postedAt: now,
    createdAt: now,
    updatedAt: now,
  }).run();

  try {
    await fetch(`${getAiServiceUrl()}/parse-job`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: id }),
    });
  } catch {
    // embedding optional at create time
  }

  return NextResponse.json({ id });
}
