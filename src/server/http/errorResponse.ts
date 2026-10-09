import { AppError, type ValidationIssue } from '@/core/errors';
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

// Errors can come from another bundle (see AppError.is), so fields are read by shape, not class.
type WithIssues = AppError & { issues?: readonly ValidationIssue[] };
type WithRetry = AppError & { retryAfterSeconds?: number };

/** Maps any error to `{ error: { code, message } }` with a safe message; details go to the log. */
export function errorResponse(error: unknown, logger: Logger): Response {
  if (!AppError.is(error)) {
    logger.error('Unhandled error in an API route', { error });
    return Response.json(INTERNAL, { status: 500 });
  }
  const status = STATUS_BY_CODE[error.code] ?? 500;
  const body: ErrorResponse = { error: { code: error.code, message: messageFor(error) } };
  const retryAfter = (error as WithRetry).retryAfterSeconds;
  const headers = retryAfter === undefined ? undefined : { 'Retry-After': String(retryAfter) };
  return Response.json(body, { status, headers });
}

function messageFor(error: WithIssues): string {
  if (!error.issues || error.issues.length === 0) return error.message;
  const issues = error.issues.map((issue) => `${issue.path}: ${issue.message}`).join('; ');
  return `${error.message} (${issues})`;
}
