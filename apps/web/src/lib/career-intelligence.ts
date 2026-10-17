import type { ApplicationStatus } from '@careersignal/shared';

export function canonicalJobUrl(raw: string): string {
  const url = new URL(raw);
  if (
    !['https:', 'http:'].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new Error('Use a public http(s) job URL.');
  if (
    url.protocol === 'http:' &&
    !['localhost', '127.0.0.1'].includes(url.hostname)
  )
    throw new Error('Use an HTTPS job URL.');
  url.hash = '';
  for (const key of [...url.searchParams.keys()])
    if (/^utm_|^(fbclid|gclid|ref|trackingId)$/i.test(key))
      url.searchParams.delete(key);
  url.searchParams.sort();
  url.hostname = url.hostname.toLowerCase();
  url.pathname = url.pathname.replace(/\/$/, '') || '/';
  return url.toString();
}
export function normalizedExcerpt(value: string) {
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
}
export function sourceSupportsExcerpt(source: string, excerpt: string) {
  return (
    normalizedExcerpt(excerpt).length >= 20 &&
    normalizedExcerpt(source).includes(normalizedExcerpt(excerpt))
  );
}
export const interviewStages = new Set<string>([
  'hr_screen',
  'technical_round',
  'case_study',
  'final_round',
  'interview',
  'offer',
]);
export interface OutcomeRecord {
  id: string;
  status: ApplicationStatus;
  appliedAt: string;
  score: number | null;
  country: string | null;
  source: string | null;
  cv: string | null;
  historicalInterview: boolean;
  historyComplete?: boolean;
}
function wilson(successes: number, n: number) {
  const z = 1.96,
    p = successes / n,
    d = 1 + (z * z) / n;
  const middle = (p + (z * z) / (2 * n)) / d;
  const margin = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return [
    Math.round(100 * Math.max(0, middle - margin)),
    Math.round(100 * Math.min(1, middle + margin)),
  ];
}
export function outcomeCohorts(
  rows: OutcomeRecord[],
  dimension: 'country' | 'source' | 'cv',
) {
  const groups = new Map<string, OutcomeRecord[]>();
  for (const row of rows.filter((r) => r.status !== 'saved')) {
    const key = row[dimension] || 'Unknown';
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return [...groups]
    .map(([label, records]) => ({
      label,
      total: records.length,
      interviews: records.filter(
        (r) => r.historicalInterview || interviewStages.has(r.status),
      ).length,
      pending: records.filter(
        (r) => !['offer', 'rejected', 'ghosted'].includes(r.status),
      ).length,
    }))
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
}
export function empiricalCalibration(rows: OutcomeRecord[], now = Date.now()) {
  // Only closed, sufficiently aged observations. This is descriptive calibration,
  // not a learned or causal estimate for a new application.
  return [
    [0, 55],
    [55, 70],
    [70, 101],
  ].map(([low, high]) => {
    const sample = rows.filter(
      (r) =>
        r.historyComplete !== false &&
        r.score != null &&
        r.score >= low &&
        r.score < high &&
        r.score <= 100 &&
        ['offer', 'rejected', 'ghosted'].includes(r.status) &&
        Date.parse(r.appliedAt) <= now - 14 * 86400000,
    );
    const interviews = sample.filter(
      (r) => r.historicalInterview || r.status === 'offer',
    ).length;
    const sufficient = sample.length >= 30;
    return {
      band: low === 0 ? '0–54.9' : low === 55 ? '55–69.9' : '70–100',
      sample: sample.length,
      interviews,
      rate: sufficient ? Math.round((100 * interviews) / sample.length) : null,
      interval: sufficient ? wilson(interviews, sample.length) : null,
    };
  });
}
export function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
export function text(
  body: Record<string, unknown>,
  key: string,
  max = 2000,
  required = false,
): string {
  const value = body[key];
  if (value == null && !required) return '';
  if (
    typeof value !== 'string' ||
    value.length > max ||
    (required && !value.trim())
  )
    throw new Error(`Invalid ${key}`);
  return value.trim();
}
