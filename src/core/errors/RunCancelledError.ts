import { AppError } from './AppError';

/** The run was stopped by a person or ran past its time limit. */
export class RunCancelledError extends AppError {
  readonly code = 'RUN_CANCELLED';

  constructor(readonly reason: 'cancelled' | 'timeout') {
    super(reason === 'timeout' ? 'The run took too long and was stopped.' : 'The run was stopped.');
  }

  /** Throws when `signal` has been aborted, preserving a RunCancelledError reason. */
  static throwIfAborted(signal: AbortSignal): void {
    if (!signal.aborted) return;
    throw signal.reason instanceof RunCancelledError
      ? signal.reason
      : new RunCancelledError('cancelled');
  }
}
