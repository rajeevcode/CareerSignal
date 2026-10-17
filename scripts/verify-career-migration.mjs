import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
const require = createRequire(
  new URL('../packages/db/package.json', import.meta.url),
);
const postgres = require('postgres');
const url = process.env.SUPABASE_DB_URL;
if (!url || !['localhost', '127.0.0.1'].includes(new URL(url).hostname))
  throw new Error('Migration verification requires the local test database');
const pool = postgres(url, { max: 1, prepare: false });
const db = await pool.reserve();
try {
  await db`BEGIN`;
  await db.unsafe(`SET LOCAL lock_timeout='5s';
    DROP TRIGGER application_record ON public.applications;
    DROP TABLE public.career_integration_items,public.career_oauth_states,public.career_connections,
      public.career_notifications,public.jd_requests,public.application_snapshots,public.application_events,
      public.career_contacts,public.captured_jobs CASCADE;
    DROP SCHEMA career_private CASCADE;
    DROP FUNCTION public.run_career_maintenance(uuid);
    ALTER TABLE public.star_stories DROP COLUMN source_excerpt,DROP COLUMN source_cv_id,DROP COLUMN candidate_verified_at;
    ALTER TABLE public.jobs DROP COLUMN captured_by CASCADE;
    ALTER TABLE public.companies DROP COLUMN captured_by CASCADE;
    ALTER TABLE public.match_scores DROP COLUMN scoring_version;
    DROP POLICY IF EXISTS p_companies_read ON public.companies;
    CREATE POLICY p_companies_read ON public.companies FOR SELECT USING(true);
    DROP POLICY IF EXISTS p_jobs_read ON public.jobs;
    CREATE POLICY p_jobs_read ON public.jobs FOR SELECT USING(status='published' OR public.is_admin());`);
  await db.unsafe(
    await readFile(
      new URL(
        '../supabase/migrations/20261017081911_complete_candidate_workflow.sql',
        import.meta.url,
      ),
      'utf8',
    ),
  );
  const [result] =
    await db`SELECT count(*)::integer AS total FROM pg_tables WHERE schemaname='public' AND tablename IN
    ('captured_jobs','application_snapshots','application_events','career_contacts','career_connections','career_oauth_states','career_integration_items','career_notifications','jd_requests')`;
  if (result.total !== 9)
    throw new Error('Migration did not create every workflow table');
  console.log(
    'Migration applies cleanly from the prior schema. All verification changes are rolled back.',
  );
} catch {
  console.error('Migration verification failed; transaction rolled back.');
  process.exitCode = 1;
} finally {
  try {
    await db`ROLLBACK`;
  } finally {
    db.release();
    await pool.end();
  }
}
