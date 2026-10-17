#!/usr/bin/env node
/**
 * Seed test auth users (auth.users can't be seeded via SQL).
 * The on_auth_user_created trigger auto-creates profile + candidate_profile +
 * usage_limits + subscription for each.
 *
 * Requires: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY
 * Usage: node supabase/seed/seed-users.mjs
 */
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
};

const USERS = [
  { email: 'candidate@careersignal.test', password: 'Passw0rd!', full_name: 'Test Candidate', role: 'candidate' },
  { email: 'admin@careersignal.test', password: 'Passw0rd!', full_name: 'Test Admin', role: 'admin' },
];

async function findUserByEmail(email) {
  // The admin list endpoint ignores ?email filter, so match client-side.
  const data = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=1000`, { headers })
    .then((r) => r.json())
    .catch(() => null);
  return data?.users?.find((x) => x.email === email) ?? null;
}

async function createUser(u) {
  const existing = await findUserByEmail(u.email);
  if (existing) {
    console.log(`  User exists: ${u.email}`);
    return existing.id;
  }

  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { full_name: u.full_name },
    }),
  });
  if (!res.ok) throw new Error(`${u.email}: ${res.status} ${await res.text()}`);
  const created = await res.json();
  console.log(`  Created user: ${u.email}`);
  return created.id;
}

async function setRole(userId, role) {
  if (role === 'candidate') return; // default
  // profiles.role is set by the trigger to 'candidate'; promote via REST (service role bypasses RLS).
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
    method: 'PATCH',
    headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify({ role }),
  });
  if (!res.ok) throw new Error(`set role ${role}: ${res.status} ${await res.text()}`);
  console.log(`  Set role ${role} for ${userId}`);
}

async function main() {
  console.log('Seeding test users...');
  for (const u of USERS) {
    const id = await createUser(u);
    await setRole(id, u.role);
  }
  console.log('\nDone. Login with candidate@careersignal.test / admin@careersignal.test (password: Passw0rd!).');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
