import { describe, expect, it } from 'vitest';
import {
  canonicalJobUrl,
  sourceSupportsExcerpt,
  empiricalCalibration,
  outcomeCohorts,
  type OutcomeRecord,
} from '@/lib/career-intelligence';
const old = '2026-01-01T00:00:00Z';
const observation = (extra: Partial<OutcomeRecord> = {}): OutcomeRecord => ({
  id: 'a',
  status: 'rejected',
  appliedAt: old,
  score: 80,
  country: 'Portugal',
  source: 'example.com',
  cv: 'version-1',
  historicalInterview: false,
  historyComplete: true,
  ...extra,
});
describe('capture identity and evidence integrity', () => {
  it('removes tracking while retaining the actual job identity', () => {
    expect(
      canonicalJobUrl(
        'https://EXAMPLE.com/jobs/123/?utm_source=mail&jobId=123&ref=feed#apply',
      ),
    ).toBe('https://example.com/jobs/123?jobId=123');
  });
  it.each([
    'javascript:alert(1)',
    'file:///etc/passwd',
    'https://user:pass@example.com/job',
    'http://example.com/job',
  ])('rejects unsafe URL %s', (value) => {
    expect(() => canonicalJobUrl(value)).toThrow();
  });
  it('requires a meaningful verbatim source excerpt, allowing only whitespace/case differences', () => {
    expect(
      sourceSupportsExcerpt(
        'Delivered a Python service\nwith a team of five.',
        'Delivered a Python service with a team of five.',
      ),
    ).toBe(true);
    expect(
      sourceSupportsExcerpt(
        'Delivered a Python service',
        'Increased revenue by 500%',
      ),
    ).toBe(false);
    expect(sourceSupportsExcerpt('Delivered a Python service', 'Python')).toBe(
      false,
    );
  });
});
describe('honest outcome cohorts and empirical calibration', () => {
  it('retains missing country and CV metadata as Unknown', () => {
    const cohorts = outcomeCohorts(
      [observation({ country: null }), observation({ status: 'saved' })],
      'country',
    );
    expect(cohorts).toEqual([
      { label: 'Unknown', total: 1, interviews: 0, pending: 0 },
    ]);
  });
  it('withholds rates below 30 observations and excludes incomplete historical records', () => {
    expect(
      empiricalCalibration(Array.from({ length: 29 }, () => observation()))[2]
        .rate,
    ).toBeNull();
    expect(
      empiricalCalibration(
        Array.from({ length: 35 }, () =>
          observation({ historyComplete: false }),
        ),
      )[2].sample,
    ).toBe(0);
  });
  it('uses recorded interviews even when the final outcome is rejection', () => {
    const rows = Array.from({ length: 30 }, (_, index) =>
      observation({ id: String(index), historicalInterview: index < 15 }),
    );
    expect(empiricalCalibration(rows)[2]).toMatchObject({
      sample: 30,
      interviews: 15,
      rate: 50,
    });
    expect(empiricalCalibration(rows)[2].interval).toEqual([33, 67]);
  });
  it('keeps fractional scores at band boundaries', () => {
    const bands = empiricalCalibration([
      observation({ score: 54.9 }),
      observation({ score: 69.9 }),
      observation({ score: 70 }),
    ]);
    expect(bands.map((band) => band.sample)).toEqual([1, 1, 1]);
  });
  it('excludes recent and still-open applications from calibration', () => {
    expect(
      empiricalCalibration([
        observation({ appliedAt: new Date().toISOString() }),
        observation({ status: 'interview' }),
      ])[2].sample,
    ).toBe(0);
  });
});
