import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

function resolveDefaultDbPath() {
  // packages/db/dist -> repo root is three levels up
  return path.resolve(__dirname, '../../../data/careersignal.db');
}

export function getDatabasePath(): string {
  return process.env.DATABASE_PATH
    ? path.resolve(process.env.DATABASE_PATH)
    : resolveDefaultDbPath();
}

let dbInstance: BetterSQLite3Database<typeof schema> | null = null;

export function getDb() {
  if (!dbInstance) {
    const dbPath = getDatabasePath();
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    const sqlite = new Database(dbPath);
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    dbInstance = drizzle(sqlite, { schema });
  }
  return dbInstance;
}

export function parseJsonArray<T = string>(value: string | null | undefined, fallback: T[] = []): T[] {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T[];
  } catch {
    return fallback;
  }
}

export function parseJsonObject<T = Record<string, unknown>>(value: string | null | undefined): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function parseEmbedding(value: string | null | undefined): number[] | null {
  return parseJsonArray<number>(value, []);
}

export function toIsoNow() {
  return new Date().toISOString();
}

export function newId() {
  return randomUUID();
}

export * from './schema';
