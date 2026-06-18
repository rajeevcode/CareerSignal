import { readFileSync } from 'fs';
import path from 'path';
import { eq } from 'drizzle-orm';
import { getDb, newId, toIsoNow } from './client';
import { companies, jobs } from './schema';

export async function seedDatabase() {
  const db = getDb();
  const seedPath = path.join(__dirname, 'seed-data.json');
  const seed = JSON.parse(readFileSync(seedPath, 'utf-8')) as {
    companies: Array<{
      name: string;
      website?: string;
      industry?: string;
      size?: string;
      location?: string;
      verified?: boolean;
    }>;
    jobs: Array<Record<string, unknown> & { company: string }>;
  };

  const companyMap: Record<string, string> = {};
  const now = toIsoNow();

  for (const c of seed.companies) {
    const existing = db.select().from(companies).where(eq(companies.name, c.name)).get();
    if (existing) {
      companyMap[c.name] = existing.id;
      continue;
    }
    const id = newId();
    db.insert(companies).values({
      id,
      name: c.name,
      website: c.website ?? null,
      industry: c.industry ?? null,
      size: c.size ?? null,
      location: c.location ?? null,
      verified: c.verified ?? true,
      description: null,
      logoUrl: null,
      createdAt: now,
    }).run();
    companyMap[c.name] = id;
  }

  let created = 0;
  for (const job of seed.jobs) {
    const companyId = companyMap[job.company as string];
    if (!companyId) continue;

    const existing = db.select().from(jobs)
      .where(eq(jobs.title, job.title as string))
      .all()
      .find((j) => j.companyId === companyId);
    if (existing) continue;

    db.insert(jobs).values({
      id: newId(),
      companyId,
      title: job.title as string,
      description: job.description as string,
      location: (job.location as string) ?? null,
      remoteType: (job.remote_type as 'remote' | 'hybrid' | 'onsite') ?? 'onsite',
      salaryMin: (job.salary_min as number) ?? null,
      salaryMax: (job.salary_max as number) ?? null,
      salaryCurrency: (job.salary_currency as string) ?? 'INR',
      experienceMin: (job.experience_min as number) ?? null,
      experienceMax: (job.experience_max as number) ?? null,
      requiredSkills: JSON.stringify(job.required_skills ?? []),
      niceToHaveSkills: JSON.stringify(job.nice_to_have_skills ?? []),
      employmentType: (job.employment_type as 'full_time') ?? 'full_time',
      visaSponsorship: Boolean(job.visa_sponsorship),
      functionTag: (job.function_tag as string) ?? null,
      techStack: JSON.stringify(job.tech_stack ?? []),
      status: 'published',
      sourceUrl: null,
      externalId: null,
      applicantCount: 0,
      embedding: null,
      postedAt: now,
      createdAt: now,
      updatedAt: now,
    }).run();
    created++;
  }

  console.log(`Seeded ${Object.keys(companyMap).length} companies, ${created} new jobs.`);
}

if (require.main === module) {
  seedDatabase().catch(console.error);
}
