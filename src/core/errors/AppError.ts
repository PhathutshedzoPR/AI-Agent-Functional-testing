/**
 * Base of every expected failure. `code` is stable and safe to send to clients; `message` must
 * not contain secrets or stack details.
 */
export abstract class AppError extends Error {
  abstract readonly code: string;

  protected constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = new.target.name;
  }
}
