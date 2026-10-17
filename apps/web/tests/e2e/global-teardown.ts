import { adminClient } from './helpers/admin';
import { TEST_PREFIX } from './env';

/** Delete every auth user created by the suite (email starts with TEST_PREFIX). */
export default async function globalTeardown() {
  const admin = adminClient();
  let deleted = 0;
  try {
    const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const testUsers = (data?.users ?? []).filter((u) => u.email?.startsWith(TEST_PREFIX));
    for (const u of testUsers) {
      try {
        const { data: files } = await admin.storage.from('cv-uploads').list(u.id);
        if (files?.length) await admin.storage.from('cv-uploads').remove(files.map((f) => `${u.id}/${f.name}`));
      } catch {
        /* ignore */
      }
      await admin.auth.admin.deleteUser(u.id);
      deleted += 1;
    }
  } catch (e) {
    console.warn('[e2e teardown] cleanup error:', (e as Error).message);
  }
  console.log(`[e2e teardown] removed ${deleted} test users`);
}
