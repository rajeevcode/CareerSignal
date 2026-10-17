import { randomUUID } from 'crypto';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

let dbInstance: PostgresJsDatabase<typeof schema> | null = null;

/**
 * Server-only privileged Postgres connection (Supabase local Postgres).
 * Bypasses RLS — every query must continue to scope by session/candidate id.
 */
export function getDb() {
  if (!dbInstance) {
    const connectionString = process.env.SUPABASE_DB_URL;
    if (!connectionString) {
      throw new Error('SUPABASE_DB_URL is not set');
    }
    const sql = postgres(connectionString, { prepare: false });
    dbInstance = drizzle(sql, { schema });
  }
  return dbInstance;
}

// ── JSON / array helpers ────────────────────────────────────────────────────
// Postgres jsonb/text[] columns come back already parsed, so these are now
// defensive passthroughs (kept for call-site compatibility).
export function parseJsonArray<T = string>(value: unknown, fallback: T[] = []): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

export function parseJsonObject<T = Record<string, unknown>>(value: unknown): T | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as T;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
  return null;
}

export function toIsoNow() {
  return new Date().toISOString();
}

export function newId() {
  return randomUUID();
}

export * from './schema';
