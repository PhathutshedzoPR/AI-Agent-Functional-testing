import { vi } from 'vitest';
import {
  RunResponseSchema,
  RunSnapshotResponseSchema,
  runApiPaths,
  type RunSnapshotResponse,
  type StartRunRequest,
} from '@/contracts';
import { TestRun } from '@/core/domain';

/** Starts a run through the app's HTTP API, as the browser would, and waits for it to finish. */
export async function finishedRunOverHttp(
  baseUrl: string,
  request: StartRunRequest,
): Promise<RunSnapshotResponse> {
  const response = await fetch(new URL(runApiPaths.runs, baseUrl), {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: baseUrl },
    body: JSON.stringify(request),
  });
  const { run } = RunResponseSchema.parse(await response.json());
  return vi.waitFor(
    async () => {
      const snapshot = await fetch(new URL(runApiPaths.run(run.id), baseUrl));
      const parsed = RunSnapshotResponseSchema.parse(await snapshot.json());
      if (!TestRun.isFinal(parsed.run.status)) throw new Error('still running');
      return parsed;
    },
    { timeout: 110_000, interval: 500 },
  );
}
