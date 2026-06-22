import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatSalary(min: number | null, max: number | null, currency = 'INR'): string {
  if (!min && !max) return 'Not disclosed';
  const fmt = (n: number) => {
    if (currency === 'INR') return `₹${(n / 100000).toFixed(1)}L`;
    if (currency === 'EUR') return `€${(n / 1000).toFixed(0)}k`;
    return `$${(n / 1000).toFixed(0)}k`;
  };
  if (min && max) return `${fmt(min)} - ${fmt(max)}`;
  return min ? `${fmt(min)}+` : `Up to ${fmt(max!)}`;
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function getAiServiceUrl(): string {
  return process.env.AI_SERVICE_URL || 'http://localhost:8000';
}

/**
 * Server-side fetch to the internal AI service. Injects the shared-secret
 * `X-Internal-Token` header (the AI service does no per-user authz of its own;
 * it trusts this backend), so this MUST only be called from server code.
 * `path` is appended to the AI service base URL (e.g. '/match/jd').
 */
export function aiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = process.env.AI_INTERNAL_TOKEN;
  const headers = new Headers(init.headers);
  if (token) headers.set('X-Internal-Token', token);
  return fetch(`${getAiServiceUrl()}${path}`, { ...init, headers });
}

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}
