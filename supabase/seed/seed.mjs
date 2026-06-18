#!/usr/bin/env node
/**
 * Seed companies and jobs into Supabase.
 * Requires: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage: node supabase/seed/seed.mjs
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const seedPath = join(__dirname, 'jobs.json');
const seed = JSON.parse(readFileSync(seedPath, 'utf-8'));

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

async function supabaseFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...options, headers: { ...headers, ...options.headers } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${path}: ${res.status} ${text}`);
  }
  return res.status === 204 ? null : res.json();
}

async function main() {
  console.log('Seeding CareerSignal...');

  const companyMap = {};
  for (const c of seed.companies) {
    const existing = await fetch(
      `${SUPABASE_URL}/rest/v1/companies?name=eq.${encodeURIComponent(c.name)}&select=id`,
      { headers },
    ).then((r) => r.json());

    if (existing?.length) {
      companyMap[c.name] = existing[0].id;
      console.log(`  Company exists: ${c.name}`);
    } else {
      const [row] = await supabaseFetch('companies', { method: 'POST', body: JSON.stringify(c) });
      companyMap[c.name] = row.id;
      console.log(`  Created company: ${c.name}`);
    }
  }

  let created = 0;
  for (const job of seed.jobs) {
    const companyId = companyMap[job.company];
    if (!companyId) {
      console.warn(`  Skip job (no company): ${job.title}`);
      continue;
    }

    const existing = await fetch(
      `${SUPABASE_URL}/rest/v1/jobs?title=eq.${encodeURIComponent(job.title)}&company_id=eq.${companyId}&select=id`,
      { headers },
    ).then((r) => r.json());

    if (existing?.length) {
      console.log(`  Job exists: ${job.title}`);
      continue;
    }

    const { company, ...jobData } = job;
    await supabaseFetch('jobs', {
      method: 'POST',
      body: JSON.stringify({
        ...jobData,
        company_id: companyId,
        status: 'published',
        posted_at: new Date().toISOString(),
      }),
    });
    created++;
    console.log(`  Created job: ${job.title}`);
  }

  console.log(`\nDone. Created ${created} new jobs.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
