import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPA_URL, SERVICE_KEY } from '../env';

/** Service-role client — bypasses RLS. Server-side test code only. */
export function adminClient(): SupabaseClient {
  return createClient(SUPA_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
}

const admin = adminClient();

export function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export async function getCandidateId(userId: string): Promise<string> {
  const { data } = await admin.from('candidate_profiles').select('id').eq('user_id', userId).maybeSingle();
  if (!data) throw new Error(`No candidate_profile for user ${userId}`);
  return data.id as string;
}

export async function setPlan(userId: string, plan: 'free' | 'pro') {
  await admin
    .from('subscriptions')
    .update({ plan, status: plan === 'pro' ? 'active' : 'inactive', updated_at: new Date().toISOString() })
    .eq('user_id', userId);
}

export async function setJdUsage(userId: string, count: number, month: string = currentMonth()) {
  await admin
    .from('usage_limits')
    .update({ jd_match_count_monthly: count, current_month: month, updated_at: new Date().toISOString() })
    .eq('user_id', userId);
}

/** Set the usage period to a past month (to test lazy monthly reset). */
export async function setUsageMonth(userId: string, month: string) {
  await admin.from('usage_limits').update({ current_month: month }).eq('user_id', userId);
}

export async function getUsage(userId: string) {
  const { data } = await admin.from('usage_limits').select('*').eq('user_id', userId).maybeSingle();
  return data;
}

export async function getSubscription(userId: string) {
  const { data } = await admin.from('subscriptions').select('*').eq('user_id', userId).maybeSingle();
  return data;
}

/** Insert N primary/non-primary CV upload rows to fast-forward the upload counter. */
export async function seedCvUploads(candidateId: string, n: number) {
  const now = new Date().toISOString();
  const rows = Array.from({ length: n }, (_, i) => ({
    candidate_id: candidateId,
    file_path: `${candidateId}/seed-${i}.pdf`,
    file_name: `seed-${i}.pdf`,
    parsed_text: 'Seed CV text. Led teams. Built systems.',
    is_primary: i === n - 1,
    uploaded_at: now,
  }));
  if (rows.length) await admin.from('cv_uploads').insert(rows);
}

/** Seed a single primary CV with real text (sections + bullets) for ATS/score/apply paths. */
export async function seedPrimaryCv(candidateId: string) {
  await admin.from('cv_uploads').update({ is_primary: false }).eq('candidate_id', candidateId);
  await admin.from('cv_uploads').insert({
    candidate_id: candidateId,
    file_path: `${candidateId}/primary.pdf`,
    file_name: 'primary.pdf',
    parsed_text:
      'John Smith\njohn@example.com\n+1 555 123 4567\nlinkedin.com/in/johnsmith\n\n' +
      'EXPERIENCE\n- Led a team of 5 engineers and increased revenue by 30%\n' +
      '- Built an analytics platform that reduced reporting time by 18 hours per week\n' +
      '- Shipped 3 products from 0 to 1 driving 25% growth\n\n' +
      'EDUCATION\nBSc Computer Science\n\nSKILLS\nPython, SQL, AI, Product Management',
    is_primary: true,
    uploaded_at: new Date().toISOString(),
  });
}

export async function countRows(table: string, candidateId: string): Promise<number> {
  const { count } = await admin.from(table).select('id', { count: 'exact', head: true }).eq('candidate_id', candidateId);
  return count ?? 0;
}

export async function setRole(userId: string, role: 'candidate' | 'recruiter' | 'admin') {
  await admin.from('profiles').update({ role }).eq('id', userId);
}

/** Find an auth user id by email (admin list, client-side match). */
export async function findUserIdByEmail(email: string): Promise<string | null> {
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  return data?.users.find((u) => u.email === email)?.id ?? null;
}

export async function cleanupUser(email: string) {
  const id = await findUserIdByEmail(email);
  if (!id) return;
  try {
    const { data } = await admin.storage.from('cv-uploads').list(id);
    if (data?.length) await admin.storage.from('cv-uploads').remove(data.map((f) => `${id}/${f.name}`));
  } catch {
    /* storage may be empty */
  }
  await admin.auth.admin.deleteUser(id); // cascades profile/candidate/usage/subs/saved/apps/etc.
}

/** Seeded published job ids (preserved across runs). */
export async function seededJobIds(limit = 12): Promise<string[]> {
  const { data } = await admin.from('jobs').select('id').eq('status', 'published').limit(limit);
  return (data ?? []).map((j) => j.id as string);
}

export async function getCompanyId(): Promise<string> {
  const { data } = await admin.from('companies').select('id').limit(1).maybeSingle();
  if (!data) throw new Error('No seeded company');
  return data.id as string;
}
