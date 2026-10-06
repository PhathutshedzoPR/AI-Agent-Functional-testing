import { AppError } from './AppError';

/** The target URL policy refused an address. */
export class TargetBlockedError extends AppError {
  readonly code = 'TARGET_BLOCKED';

  constructor(readonly reason: string) {
    super(`That address is not allowed: ${reason}.`);
  }
}
