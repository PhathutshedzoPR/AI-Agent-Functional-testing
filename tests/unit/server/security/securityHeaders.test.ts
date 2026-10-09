import { describe, expect, it } from 'vitest';
import { securityHeaders } from '@/server/security/securityHeaders';

const headerMap = (isDevelopment: boolean): Map<string, string> =>
  new Map(securityHeaders(isDevelopment).map(({ key, value }) => [key, value]));

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

  it("allows 'unsafe-eval' in development only", () => {
    expect(headerMap(true).get('Content-Security-Policy')).toContain("'unsafe-eval'");
    expect(headerMap(false).get('Content-Security-Policy')).not.toContain("'unsafe-eval'");
  });
});
