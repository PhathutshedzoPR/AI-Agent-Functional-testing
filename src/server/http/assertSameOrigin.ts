import { ForbiddenError } from '@/core/errors';

/**
 * CSRF-lite (CLAUDE.md section 4, item 6): a state-changing request must carry an Origin header
 * equal to the app's own origin. Browsers always send Origin on cross-site POSTs.
 */
export function assertSameOrigin(request: Request, appBaseUrl: string): void {
  const expected = new URL(appBaseUrl).origin;
  if (request.headers.get('origin') !== expected) {
    // The app's own public address, so naming it tells someone on another address (localhost
    // while a tunnel is live, say) where to go.
    throw new ForbiddenError(
      `This server only takes runs started from ${expected}. Open TestPilot there and try again.`,
    );
  }
}
