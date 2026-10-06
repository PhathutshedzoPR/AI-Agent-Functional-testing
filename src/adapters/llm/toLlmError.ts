import { APICallError, NoObjectGeneratedError, NoOutputGeneratedError, RetryError } from 'ai';
import { LlmError } from '@/core/errors';

/** Maps AI SDK failures to LlmError with a message that is safe to show. */
export function toLlmError(error: unknown): LlmError {
  if (error instanceof LlmError) return error;
  if (NoObjectGeneratedError.isInstance(error) || NoOutputGeneratedError.isInstance(error)) {
    return new LlmError('The language model returned something that did not match the schema.', {
      cause: error,
    });
  }
  if (RetryError.isInstance(error)) {
    return new LlmError('The language model provider kept failing, even after a retry.', {
      retryable: true,
      cause: error,
    });
  }
  if (APICallError.isInstance(error)) {
    const status = error.statusCode === undefined ? 'no status' : `status ${error.statusCode}`;
    return new LlmError(`The language model provider refused the request (${status}).`, {
      retryable: error.isRetryable,
      cause: error,
    });
  }
  return new LlmError('The language model call failed.', { cause: error });
}
