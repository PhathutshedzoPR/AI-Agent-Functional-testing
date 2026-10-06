import type { RunEvent, TestRun } from '../domain';

/** Stores run metadata and the event log each run's view is projected from (Repository). */
export interface IRunRepository {
  save(run: TestRun): Promise<void>;
  get(runId: string): Promise<TestRun | null>;
  /** Newest first. */
  list(limit: number): Promise<readonly TestRun[]>;
  appendEvent(event: RunEvent): Promise<void>;
  /** Events in `seq` order, optionally only those after `afterSeq`. */
  events(runId: string, afterSeq?: number): Promise<readonly RunEvent[]>;
}
