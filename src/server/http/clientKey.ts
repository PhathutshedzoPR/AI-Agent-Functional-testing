/**
 * A key for rate limiting: the first forwarded address, or "local". Headers can be spoofed when
 * the app is reachable without a trusted proxy in front; the limiter is a speed bump, not auth.
 */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || request.headers.get('x-real-ip')?.trim() || 'local';
}
