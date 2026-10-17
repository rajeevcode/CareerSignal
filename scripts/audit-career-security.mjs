import { createRequire } from 'node:module';
const require = createRequire(
  new URL('../packages/db/package.json', import.meta.url),
);
const postgres = require('postgres');
const url = process.env.SUPABASE_DB_URL;
if (!url || !['localhost', '127.0.0.1'].includes(new URL(url).hostname))
  throw new Error('Security checks require the local test stack');
const db = postgres(url, { max: 1, prepare: false });
try {
  const rows = await db`SELECT c.relname AS name,c.relrowsecurity AS rls,
    has_table_privilege('anon',c.oid,'SELECT') AS anonymous_read,
    has_table_privilege('authenticated',c.oid,'SELECT') AS authenticated_read,
    has_table_privilege('authenticated',c.oid,'UPDATE') AS authenticated_update
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN
    ('captured_jobs','application_snapshots','application_events','career_contacts','career_connections','career_oauth_states','career_integration_items','career_notifications','jd_requests')`;
  if (rows.length !== 9) throw new Error('Workflow schema is incomplete');
  for (const row of rows) {
    if (!row.rls || row.anonymous_read)
      throw new Error('Workflow table access is not restricted');
    if (
      ['career_connections', 'career_oauth_states', 'jd_requests'].includes(
        row.name,
      ) &&
      row.authenticated_read
    )
      throw new Error('Credential or request data is client-readable');
    if (row.authenticated_update)
      throw new Error('Client can bypass server validation');
  }
  const functions =
    await db`SELECT p.proname AS name,p.prosecdef AS definer,has_function_privilege('anon',p.oid,'EXECUTE') AS anonymous_execute,
    has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='career_private' OR (n.nspname='public' AND p.proname='run_career_maintenance')`;
  if (
    functions.length !== 5 ||
    functions.some((f) => f.anonymous_execute || f.authenticated_execute)
  )
    throw new Error('Privileged workflow functions are callable by clients');
  console.log(
    JSON.stringify({ status: 'passed', tables: rows, functions }, null, 2),
  );
} catch {
  console.error(
    'Workflow database security audit failed. Check migration and grants.',
  );
  process.exitCode = 1;
} finally {
  await db.end();
}
