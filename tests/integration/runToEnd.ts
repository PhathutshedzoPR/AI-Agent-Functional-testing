import { vi } from 'vitest';
import { TestRun, projectRun, type RunView } from '@/core/domain';
import type { createContainer } from '@/server/createContainer';

type Runs = ReturnType<typeof createContainer>['runs'];

/** Waits for a run to reach a final status, then returns its view, built from its events. */
export async function runToEnd(runs: Runs, runId: string): Promise<RunView> {
  await vi.waitFor(
    async () => {
      const { run } = await runs.get(runId);
      if (!TestRun.isFinal(run.status)) throw new Error('still running');
    },
    { timeout: 110_000, interval: 250 },
  );
  return projectRun((await runs.get(runId)).events);
}
