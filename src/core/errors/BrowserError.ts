import { AppError } from './AppError';

/**
 * Why a browser operation failed. `not-found` and `ambiguous` are the only kinds self-healing
 * may act on.
 */
export type BrowserFailure =
  'not-found' | 'ambiguous' | 'timeout' | 'navigation' | 'blocked' | 'other';

export class BrowserError extends AppError {
  readonly code = 'BROWSER_FAILED';

  constructor(
    readonly failure: BrowserFailure,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
  }

  get isLocatorProblem(): boolean {
    return this.failure === 'not-found' || this.failure === 'ambiguous';
  }
}
