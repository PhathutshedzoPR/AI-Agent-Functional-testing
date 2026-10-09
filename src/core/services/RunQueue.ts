import { RunCancelledError } from '../errors';

export type QueuedRun = Readonly<{
  runId: string;
  /** Runs the job. Must handle its own errors; the signal aborts on cancel. */
  execute: (signal: AbortSignal) => Promise<void>;
}>;

export type CancelOutcome = 'removed' | 'stopping' | 'unknown';

/**
 * One run at a time (each one drives a real browser); the rest wait in order (CLAUDE.md s4, 9).
 */
export class RunQueue {
  private readonly waiting: QueuedRun[] = [];
  private active: Readonly<{ runId: string; controller: AbortController }> | null = null;

  constructor(private readonly onUnexpectedError: (error: unknown) => void) {}

  enqueue(job: QueuedRun): void {
    this.waiting.push(job);
    this.startNext();
  }

  /** Removes a waiting run, or asks the running one to stop. */
  cancel(runId: string): CancelOutcome {
    if (this.active?.runId === runId) {
      this.active.controller.abort(new RunCancelledError('cancelled'));
      return 'stopping';
    }
    const index = this.waiting.findIndex((job) => job.runId === runId);
    if (index < 0) return 'unknown';
    this.waiting.splice(index, 1);
    return 'removed';
  }

  get pending(): number {
    return this.waiting.length;
  }

  get activeRunId(): string | null {
    return this.active?.runId ?? null;
  }

  private startNext(): void {
    if (this.active) return;
    const job = this.waiting.shift();
    if (!job) return;
    const controller = new AbortController();
    this.active = { runId: job.runId, controller };
    // Runs in the background; the job reports its own outcome through events.
    void this.runJob(job, controller.signal);
  }

  private async runJob(job: QueuedRun, signal: AbortSignal): Promise<void> {
    try {
      await job.execute(signal);
    } catch (error) {
      this.onUnexpectedError(error);
    } finally {
      this.active = null;
      this.startNext();
    }
  }
}
