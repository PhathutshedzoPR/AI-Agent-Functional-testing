import { errors } from 'playwright';
import { BrowserError } from '@/core/errors';

const BLOCKED_MARKERS = ['ERR_BLOCKED_BY_CLIENT', 'ERR_ABORTED'];

/** Maps whatever Playwright threw to a BrowserError with a short, safe message. */
export function toBrowserError(error: unknown, action: string): BrowserError {
  if (error instanceof BrowserError) return error;
  const detail = error instanceof Error ? firstLine(error.message) : 'unknown error';
  if (error instanceof errors.TimeoutError) {
    return new BrowserError('timeout', `${action} timed out`, { cause: error });
  }
  if (BLOCKED_MARKERS.some((marker) => detail.includes(marker))) {
    return new BrowserError('blocked', `${action} was blocked by the target policy`, {
      cause: error,
    });
  }
  return new BrowserError('other', `${action} failed: ${detail}`, { cause: error });
}

function firstLine(message: string): string {
  const line = message.split('\n', 1)[0] ?? '';
  return line.length > 200 ? `${line.slice(0, 200)}...` : line;
}
