import { AppError, RateLimitError, ValidationError } from '@/core/errors';
import type { ErrorResponse } from '@/contracts';
import type { Logger } from '../logger';

const STATUS_BY_CODE: Readonly<Record<string, number>> = {
  VALIDATION_FAILED: 400,
  DOMAIN_INVALID: 400,
  TARGET_BLOCKED: 400,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  RUN_CANCELLED: 409,
  RATE_LIMITED: 429,
  LLM_FAILED: 502,
  BROWSER_FAILED: 502,
};

const INTERNAL: ErrorResponse = {
  error: { code: 'INTERNAL', message: 'Something went wrong on our side. Try again in a moment.' },
};

/** Maps any error to `{ error: { code, message } }` with a safe message; details go to the log. */
export function errorResponse(error: unknown, logger: Logger): Response {
  if (!(error instanceof AppError)) {
    logger.error('Unhandled error in an API route', { error });
    return Response.json(INTERNAL, { status: 500 });
  }
  const status = STATUS_BY_CODE[error.code] ?? 500;
  const body: ErrorResponse = { error: { code: error.code, message: messageFor(error) } };
  const headers =
    error instanceof RateLimitError
      ? { 'Retry-After': String(error.retryAfterSeconds) }
      : undefined;
  return Response.json(body, { status, headers });
}

function messageFor(error: AppError): string {
  if (!(error instanceof ValidationError) || error.issues.length === 0) return error.message;
  const issues = error.issues.map((issue) => `${issue.path}: ${issue.message}`).join('; ');
  return `${error.message} (${issues})`;
}
