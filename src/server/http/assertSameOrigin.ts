import { ForbiddenError } from '@/core/errors';

/**
 * CSRF-lite (CLAUDE.md section 4, item 6): a state-changing request must carry an Origin header
 * equal to the app's own origin. Browsers always send Origin on cross-site POSTs.
 */
export function assertSameOrigin(request: Request, appBaseUrl: string): void {
  const origin = request.headers.get('origin');
  if (origin !== new URL(appBaseUrl).origin) {
    throw new ForbiddenError('This request must come from the TestPilot app itself.');
  }
}
