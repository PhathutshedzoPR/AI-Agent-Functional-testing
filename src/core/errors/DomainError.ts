import { AppError } from './AppError';

/** A domain object was asked to hold a value that breaks one of its rules. */
export class DomainError extends AppError {
  readonly code = 'DOMAIN_INVALID';

  constructor(
    message: string,
    readonly details: readonly string[] = [],
  ) {
    super(message);
  }
}
