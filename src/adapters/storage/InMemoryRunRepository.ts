import { TestRun, type RunEvent } from '@/core/domain';
import type { IRunRepository } from '@/core/ports';

const DEFAULT_MAX_RUNS = 100;

/**
 * Runs and their events in process memory (Repository). History lasts until the server restarts;
 * the oldest finished runs are dropped past `maxRuns` so memory stays bounded.
 */
export class InMemoryRunRepository implements IRunRepository {
  private readonly runs = new Map<string, TestRun>();
  private readonly eventLog = new Map<string, RunEvent[]>();

  constructor(private readonly maxRuns = DEFAULT_MAX_RUNS) {}

  save(run: TestRun): Promise<void> {
    this.runs.set(run.id, run);
    this.evictOldFinishedRuns();
    return Promise.resolve();
  }

  get(runId: string): Promise<TestRun | null> {
    return Promise.resolve(this.runs.get(runId) ?? null);
  }

  list(limit: number): Promise<readonly TestRun[]> {
    const newestFirst = [...this.runs.values()].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
    return Promise.resolve(newestFirst.slice(0, limit));
  }

  appendEvent(event: RunEvent): Promise<void> {
    const log = this.eventLog.get(event.runId) ?? [];
    log.push(event);
    this.eventLog.set(event.runId, log);
    return Promise.resolve();
  }

  events(runId: string, afterSeq = 0): Promise<readonly RunEvent[]> {
    const log = this.eventLog.get(runId) ?? [];
    return Promise.resolve(log.filter((event) => event.seq > afterSeq));
  }

  private evictOldFinishedRuns(): void {
    const excess = this.runs.size - this.maxRuns;
    if (excess <= 0) return;
    const oldestFinished = [...this.runs.values()]
      .filter((run) => TestRun.isFinal(run.status))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .slice(0, excess);
    for (const run of oldestFinished) {
      this.runs.delete(run.id);
      this.eventLog.delete(run.id);
    }
  }
}
