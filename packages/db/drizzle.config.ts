import path from 'path';
import fs from 'fs';
import { defineConfig } from 'drizzle-kit';

const dbPath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.resolve(__dirname, '../../data/careersignal.db');

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export default defineConfig({
  schema: './src/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: dbPath,
  },
});
