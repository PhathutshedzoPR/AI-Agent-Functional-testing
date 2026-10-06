import { AppError } from './AppError';

/** The request is not allowed from where it came, e.g. another site posting to our API. */
export class ForbiddenError extends AppError {
  readonly code = 'FORBIDDEN';

  constructor(message: string) {
    super(message);
  }
}
