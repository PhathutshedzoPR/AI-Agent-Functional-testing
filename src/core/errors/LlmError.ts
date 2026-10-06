import { AppError } from './AppError';

/** The language model failed, returned something unusable, or the run's call budget ran out. */
export class LlmError extends AppError {
  readonly code = 'LLM_FAILED';
  readonly retryable: boolean;

  constructor(message: string, options: { retryable?: boolean; cause?: unknown } = {}) {
    super(message, { cause: options.cause });
    this.retryable = options.retryable ?? false;
  }
}
