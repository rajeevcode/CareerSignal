import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getRecruiterProfile } from '@/lib/queries';
import { aiFetch } from '@/lib/utils';
import { getDb, jobs, newId, toIsoNow } from '@careersignal/db';

const REMOTE_TYPES = ['remote', 'hybrid', 'onsite'] as const;
const EMPLOYMENT_TYPES = ['full_time', 'contract', 'internship', 'part_time'] as const;
const JOB_STATUSES = ['draft', 'published', 'closed'] as const;

function pickEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

async function requireRecruiter() {
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (session.role !== 'recruiter') return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return { session };
}

export async function POST(request: Request) {
  const auth = await requireRecruiter();
  if ('error' in auth && auth.error) return auth.error;

  // A recruiter may only post jobs under their OWN bound company. Never trust a
  // company_id from the request body (that would let any recruiter post under
  // any company / impersonate). Derive it from the recruiter profile.
  const recruiter = await getRecruiterProfile(auth.session!.userId);
  if (!recruiter?.companyId) {
    return NextResponse.json({ error: 'No company is linked to your recruiter account' }, { status: 403 });
  }

  const body = await request.json();
  if (typeof body.title !== 'string' || !body.title.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }
  if (typeof body.description !== 'string' || !body.description.trim()) {
    return NextResponse.json({ error: 'Description is required' }, { status: 400 });
  }

  const db = getDb();
  const now = toIsoNow();
  const id = newId();

  await db.insert(jobs).values({
    id,
    companyId: recruiter.companyId,
    title: body.title,
    description: body.description,
    location: body.location ?? null,
    remoteType: pickEnum(body.remote_type, REMOTE_TYPES, 'onsite'),
    salaryMin: body.salary_min ?? null,
    salaryMax: body.salary_max ?? null,
    salaryCurrency: body.salary_currency ?? 'INR',
    experienceMin: body.experience_min ?? null,
    experienceMax: body.experience_max ?? null,
    requiredSkills: body.required_skills ?? [],
    niceToHaveSkills: body.nice_to_have_skills ?? [],
    employmentType: pickEnum(body.employment_type, EMPLOYMENT_TYPES, 'full_time'),
    visaSponsorship: Boolean(body.visa_sponsorship),
    functionTag: body.function_tag ?? null,
    techStack: body.tech_stack ?? [],
    status: pickEnum(body.status, JOB_STATUSES, 'published'),
    recruiterId: auth.session!.userId,
    sourceUrl: null,
    externalId: null,
    applicantCount: 0,
    postedAt: now,
    createdAt: now,
    updatedAt: now,
  });

  try {
    await aiFetch(`/parse-job`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: id }),
    });
  } catch {
    // embedding optional at create time
  }

  return NextResponse.json({ id });
}
