import { describe, expect, it } from 'vitest';
import { securityHeaders } from '@/server/security/securityHeaders';

const headerMap = (isDevelopment: boolean, allowFraming = false): Map<string, string> =>
  new Map(securityHeaders({ isDevelopment, allowFraming }).map(({ key, value }) => [key, value]));

describe('securityHeaders', () => {
  it('sets the baseline hardening headers', () => {
    const headers = headerMap(false);

    expect(headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(headers.get('X-Frame-Options')).toBe('DENY');
    expect(headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(headers.get('Permissions-Policy')).toContain('camera=()');
  });

  it('forbids framing and plugins in the CSP', () => {
    const csp = headerMap(false).get('Content-Security-Policy');

    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("default-src 'self'");
  });

  it("allows 'unsafe-eval' and leaves out HSTS in development only", () => {
    expect(headerMap(true).get('Content-Security-Policy')).toContain("'unsafe-eval'");
    expect(headerMap(false).get('Content-Security-Policy')).not.toContain("'unsafe-eval'");
    expect(headerMap(true).has('Strict-Transport-Security')).toBe(false);
    expect(headerMap(false).get('Strict-Transport-Security')).toContain('max-age=');
  });

  it("drops the clickjacking protection only for the demo shop's seeded misconfiguration", () => {
    const framed = headerMap(false, true);

    expect(framed.get('Content-Security-Policy')).not.toContain('frame-ancestors');
    expect(framed.get('X-Frame-Options')).toBe('ALLOWALL');
    expect(framed.get('X-Content-Type-Options')).toBe('nosniff');
  });
});
