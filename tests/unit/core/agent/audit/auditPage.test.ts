import { describe, expect, it } from 'vitest';
import { auditPage, performanceChecks, securityChecks } from '@/core/agent/audit';
import { PageAudit, type AuditCheck } from '@/core/domain';
import type { PageMeasurement } from '@/core/ports';

const SAFE_HEADERS = {
  'content-security-policy': "default-src 'self'; frame-ancestors 'none'",
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'strict-transport-security': 'max-age=63072000',
};

const page = (overrides: Partial<PageMeasurement> = {}): PageMeasurement => ({
  url: 'https://shop.example/menu',
  ttfbMs: 120,
  loadMs: 900,
  lcpMs: 700,
  headers: SAFE_HEADERS,
  cookies: [],
  ...overrides,
});

const statusOf = (checks: readonly AuditCheck[], name: RegExp): string | undefined =>
  checks.find((check) => name.test(check.name))?.status;

describe('performanceChecks', () => {
  it('passes timings within budget and fails the ones over it, with the measured value', () => {
    const checks = performanceChecks(page({ ttfbMs: 3_210, lcpMs: 2_400, loadMs: 3_600 }));

    expect(checks.map((check) => [check.status, check.actual, check.expected])).toEqual([
      ['failed', '3210 ms', 'at most 800 ms'],
      ['passed', '2400 ms', 'at most 2500 ms'],
      ['failed', '3600 ms', 'at most 3000 ms'],
    ]);
  });

  it('skips a timing the browser did not report rather than guessing it', () => {
    const [, lcp] = performanceChecks(page({ lcpMs: null }));

    expect(lcp).toMatchObject({ status: 'skipped', actual: 'not reported' });
  });
});

describe('securityChecks', () => {
  it('passes a page served over HTTPS with the usual protective headers', () => {
    const checks = securityChecks(page());

    expect(checks.filter((check) => check.status !== 'passed')).toEqual([
      expect.objectContaining({
        name: 'Cookies only travel over HTTPS (Secure)',
        status: 'skipped',
      }),
    ]);
  });

  it('flags missing headers and a page that any site can frame', () => {
    const checks = securityChecks(
      page({ headers: { 'content-security-policy': "default-src 'self'; frame-ancestors *" } }),
    );

    expect(statusOf(checks, /MIME sniffing/)).toBe('failed');
    expect(statusOf(checks, /Referrer Policy/)).toBe('failed');
    expect(statusOf(checks, /HSTS/)).toBe('failed');
    expect(checks.find((check) => /clickjacking/.test(check.name))).toMatchObject({
      status: 'failed',
      actual: 'frame-ancestors *',
    });
  });

  it('shows the start of a long header rather than all of it', () => {
    const csp = `default-src 'self'; ${'img-src https://cdn.example; '.repeat(5)}`;
    const shown = securityChecks(
      page({ headers: { ...SAFE_HEADERS, 'content-security-policy': csp } }),
    ).find((check) => /Content Security Policy/.test(check.name))?.actual;

    expect(shown).toHaveLength(60);
    expect(shown?.endsWith('...')).toBe(true);
  });

  it('accepts X-Frame-Options alone as clickjacking protection', () => {
    const headers = { ...SAFE_HEADERS, 'content-security-policy': "default-src 'self'" };

    expect(statusOf(securityChecks(page({ headers })), /clickjacking/)).toBe('passed');
  });

  it('skips the HTTPS checks on a local address and fails them on a public one', () => {
    const local = securityChecks(page({ url: 'http://localhost:3000/demo-shop/stable' }));
    const remote = securityChecks(page({ url: 'http://shop.example/' }));

    expect(statusOf(local, /Served over HTTPS/)).toBe('skipped');
    expect(statusOf(local, /HSTS/)).toBe('skipped');
    expect(statusOf(remote, /Served over HTTPS/)).toBe('failed');
  });

  it('names the cookies that are not marked Secure', () => {
    const cookies = [
      { name: 'session', secure: true },
      { name: 'cart', secure: false },
    ];

    expect(securityChecks(page({ cookies })).at(-1)).toMatchObject({
      status: 'failed',
      actual: 'not Secure: cart',
    });
    expect(securityChecks(page({ cookies: cookies.slice(0, 1) })).at(-1)?.status).toBe('passed');
    expect(securityChecks(page({ url: 'http://localhost:3000/', cookies })).at(-1)?.status).toBe(
      'skipped',
    );
  });
});

describe('auditPage', () => {
  it('puts both kinds of check on the page and counts the failures', () => {
    const audit = auditPage(page({ ttfbMs: 2_000, headers: {} }));

    expect(audit.url).toBe('https://shop.example/menu');
    expect(new Set(audit.checks.map((check) => check.category))).toEqual(
      new Set(['performance', 'security']),
    );
    expect(PageAudit.failed([audit])).toBe(6);
  });
});
