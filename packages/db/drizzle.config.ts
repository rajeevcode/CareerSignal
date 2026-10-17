import { defineConfig } from 'drizzle-kit';

const url = process.env.SUPABASE_DB_URL;

if (!url) {
  throw new Error('SUPABASE_DB_URL is required for Drizzle commands');
}

export default defineConfig({
  schema: './src/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url,
  },
  strict: true,
  verbose: true,
});
