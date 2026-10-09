import { AppError } from './AppError';

/** A Playwright check on the page did not hold. This is a test failure, never a reason to heal. */
export class AssertionFailedError extends AppError {
  readonly code = 'ASSERTION_FAILED';

  constructor(
    readonly expected: string,
    readonly actual: string,
  ) {
    super(`Expected ${expected}, but ${actual}.`);
  }
}
