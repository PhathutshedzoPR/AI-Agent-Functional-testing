import { AppError } from './AppError';

/** A requested resource (run, screenshot, export format) does not exist. */
export class NotFoundError extends AppError {
  readonly code = 'NOT_FOUND';

  constructor(resource: string) {
    super(`${resource} was not found.`);
  }
}
