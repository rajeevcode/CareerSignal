import { readdirSync, readFileSync, statSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { SERVICE_KEY } from '../env';

const STATIC_DIR = resolve(__dirname, '../../../.next/static');

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (p.endsWith('.js')) out.push(p);
  }
  return out;
}

/**
 * Scan the built client bundle for the service-role key. Returns the list of
 * offending files (empty = clean). Requires a prior `next build`.
 */
export function grepNextStaticForSecret(): { built: boolean; offenders: string[] } {
  const files = walk(STATIC_DIR);
  if (files.length === 0) return { built: false, offenders: [] };
  const offenders: string[] = [];
  for (const f of files) {
    const content = readFileSync(f, 'utf-8');
    if (content.includes(SERVICE_KEY) || content.includes('sb_secret_')) offenders.push(f);
  }
  return { built: true, offenders };
}
