import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Return a safe same-origin redirect path. Accepts only a single-leading-slash
 * relative path; rejects protocol-relative ('//evil.com'), backslash variants
 * (browsers normalize '\' to '/', turning '/\evil.com' into '//evil.com'), and
 * absolute URLs — any of which could escape the origin. Defaults to /dashboard.
 * Pure string logic, so it's safe to use from both server routes and client
 * components.
 */
export function safeRedirectPath(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) {
    return '/dashboard';
  }
  return raw;
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

/**
 * Fire-and-forget call to the AI service for non-blocking work (e.g. embedding
 * a freshly created job). Never throws, so callers don't need a try/catch — but
 * unlike a bare swallow it LOGS both transport errors and non-2xx responses, so
 * a 401 from an AI_INTERNAL_TOKEN / INTERNAL_API_TOKEN mismatch surfaces as a
 * warning instead of silently degrading data quality.
 */
export async function aiFetchBestEffort(path: string, init: RequestInit = {}): Promise<void> {
  try {
    const res = await aiFetch(path, init);
    if (!res.ok) {
      const hint = res.status === 401 ? ' (check AI_INTERNAL_TOKEN matches the AI service INTERNAL_API_TOKEN)' : '';
      console.warn(`[aiFetch] ${init.method ?? 'GET'} ${path} -> ${res.status}${hint}`);
    }
  } catch (err) {
    console.warn(`[aiFetch] ${init.method ?? 'GET'} ${path} failed:`, err);
  }
}

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}
