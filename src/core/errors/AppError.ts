// Symbol.for is shared process-wide, unlike a class: Next bundles pages and route handlers
// separately, so an error made in one bundle fails `instanceof` against the other's AppError.
const APP_ERROR = Symbol.for('testpilot.AppError');

/**
 * Base of every expected failure. `code` is stable and safe to send to clients; `message` must
 * not contain secrets or stack details.
 */
export abstract class AppError extends Error {
  abstract readonly code: string;
  readonly [APP_ERROR] = true;

  protected constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = new.target.name;
  }

  /** True for any AppError, whichever bundle created it. Prefer this over `instanceof`. */
  static is(value: unknown): value is AppError {
    return (
      typeof value === 'object' &&
      value !== null &&
      (value as Record<symbol, unknown>)[APP_ERROR] === true
    );
  }
}
