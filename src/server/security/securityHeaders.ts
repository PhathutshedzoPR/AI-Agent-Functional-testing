export type HttpHeader = Readonly<{ key: string; value: string }>;

export type SecurityHeaderOptions = Readonly<{
  isDevelopment: boolean;
  /**
   * Kota Express's seeded clickjacking misconfiguration (the `framingAllowed` bug flag): no
   * frame-ancestors, and an X-Frame-Options value browsers ignore. Never set for TestPilot's pages.
   */
  allowFraming?: boolean;
}>;

/**
 * Response headers for every route (CLAUDE.md section 4, item 12). React needs 'unsafe-eval' in
 * development only. Scripts keep 'unsafe-inline' because Next injects inline bootstrap scripts
 * and nonces would force every page to render dynamically.
 */
export function securityHeaders({
  isDevelopment,
  allowFraming = false,
}: SecurityHeaderOptions): readonly HttpHeader[] {
  const scriptSources = ["'self'", "'unsafe-inline'", ...(isDevelopment ? ["'unsafe-eval'"] : [])];
  const contentSecurityPolicy = [
    "default-src 'self'",
    `script-src ${scriptSources.join(' ')}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    ...(allowFraming ? [] : ["frame-ancestors 'none'"]),
  ].join('; ');

  return [
    { key: 'Content-Security-Policy', value: contentSecurityPolicy },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: allowFraming ? 'ALLOWALL' : 'DENY' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()',
    },
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
    // Browsers ignore HSTS over plain HTTP, so it is harmless on localhost and binding behind TLS.
    ...(isDevelopment
      ? []
      : [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' }]),
  ];
}
