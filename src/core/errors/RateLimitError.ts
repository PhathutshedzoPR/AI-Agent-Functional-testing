import { AppError } from './AppError';

/** Too many requests from one client in the current window. */
export class RateLimitError extends AppError {
  readonly code = 'RATE_LIMITED';

  constructor(readonly retryAfterSeconds: number) {
    super(`Too many runs started. Try again in ${retryAfterSeconds} seconds.`);
  }
}
