import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  aiFetch,
  aiFetchBestEffort,
  cn,
  formatDate,
  formatSalary,
  getAiServiceUrl,
  getAppUrl,
  safeRedirectPath,
} from '@/lib/utils';

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('safeRedirectPath', () => {
  it.each([undefined, null, '', 'dashboard', 'https://evil.test', '//evil.test', '/\\evil.test'])(
    'falls back for unsafe value %s',
    (value) => {
      expect(safeRedirectPath(value)).toBe('/dashboard');
    },
  );

  it.each(['/dashboard', '/jobs?remote=true', '/account#billing'])(
    'preserves safe same-origin path %s',
    (value) => {
      expect(safeRedirectPath(value)).toBe(value);
    },
  );
});

describe('formatSalary', () => {
  it('formats undisclosed, ranges, minimums, and maximums', () => {
    expect(formatSalary(null, null)).toBe('Not disclosed');
    expect(formatSalary(1_000_000, 2_000_000)).toBe('₹10.0L - ₹20.0L');
    expect(formatSalary(80_000, null, 'EUR')).toBe('€80k+');
    expect(formatSalary(null, 120_000, 'USD')).toBe('Up to $120k');
  });
});

describe('presentation utilities', () => {
  it('merges conditional classes and resolves Tailwind conflicts', () => {
    expect(cn('px-2', false && 'hidden', ['font-medium', 'px-4'])).toBe(
      'font-medium px-4',
    );
  });

  it('formats dates for the product locale', () => {
    expect(formatDate('2026-07-17T12:00:00.000Z')).toBe('17 Jul 2026');
  });
});

describe('application service URLs', () => {
  it('uses defaults and environment overrides', () => {
    delete process.env.AI_SERVICE_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    expect(getAiServiceUrl()).toBe('http://localhost:8000');
    expect(getAppUrl()).toBe('http://localhost:3000');

    process.env.AI_SERVICE_URL = 'http://ai.internal:9000';
    process.env.NEXT_PUBLIC_APP_URL = 'https://careersignal.test';
    expect(getAiServiceUrl()).toBe('http://ai.internal:9000');
    expect(getAppUrl()).toBe('https://careersignal.test');
  });
});

describe('AI fetch helpers', () => {
  it('targets the configured service and adds the internal token', async () => {
    process.env.AI_SERVICE_URL = 'http://ai.internal:9000';
    process.env.AI_INTERNAL_TOKEN = 'test-token';
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    await aiFetch('/health', {
      method: 'POST',
      headers: { 'X-Correlation-Id': 'test-request' },
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://ai.internal:9000/health');
    expect(init.method).toBe('POST');
    const headers = new Headers(init.headers);
    expect(headers.get('X-Internal-Token')).toBe('test-token');
    expect(headers.get('X-Correlation-Id')).toBe('test-request');
  });

  it('does not add an empty internal token', async () => {
    delete process.env.AI_INTERNAL_TOKEN;
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await aiFetch('/health');

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(init.headers).has('X-Internal-Token')).toBe(false);
  });

  it('logs non-success and transport failures without throwing', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockRejectedValueOnce(new Error('offline'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(aiFetchBestEffort('/embed', { method: 'POST' })).resolves.toBeUndefined();
    await expect(aiFetchBestEffort('/embed')).resolves.toBeUndefined();

    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn.mock.calls[0]?.[0]).toContain('check AI_INTERNAL_TOKEN');
    expect(warn.mock.calls[1]?.[0]).toContain('failed');
  });
});
