import { AppError } from './AppError';

export type ValidationIssue = Readonly<{ path: string; message: string }>;

/** Input from outside the system (HTTP, CLI) failed its schema. */
export class ValidationError extends AppError {
  readonly code = 'VALIDATION_FAILED';

  constructor(
    message: string,
    readonly issues: readonly ValidationIssue[] = [],
  ) {
    super(message);
  }
}
