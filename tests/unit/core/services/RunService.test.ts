import { describe, expect, it, vi } from 'vitest';
import { InMemoryEventBus } from '@/adapters/events';
import { createDefaultExporters } from '@/adapters/exporters';
import { InMemoryRunRepository } from '@/adapters/storage';
import { TestRun, projectRun, type RunEvent } from '@/core/domain';
import {
  LlmError,
  NotFoundError,
  RunCancelledError,
  TargetBlockedError,
  ValidationError,
} from '@/core/errors';
import type { ITargetPolicy } from '@/core/ports';
import { RunEmitter, RunQueue, RunService } from '@/core/services';
import { agentHarness } from '../../../fakes/agentHarness';
import { FakeLanguageModel } from '../../../fakes/FakeLanguageModel';

const UUID = /^[\da-f-]{36}$/;
let counter = 0;
const uuids = {
  next: () => `00000000-0000-4000-8000-${String(++counter).padStart(12, '0')}`,
};

const allowLocalShop: ITargetPolicy = {
  assertAllowed: (url) => {
    const parsed = new URL(url);
    if (parsed.host !== 'localhost:3000') {
      return Promise.reject(new TargetBlockedError(`${parsed.host} is not on the allowlist`));
    }
    return Promise.resolve(parsed);
  },
  isAllowed: (url) => Promise.resolve(new URL(url).host === 'localhost:3000'),
};

function service(
  overrides: { llm?: FakeLanguageModel; pageText?: string; runTimeoutMs?: number } = {},
) {
  const harness = agentHarness(overrides.pageText);
  const repository = new InMemoryRunRepository();
  const bus = new InMemoryEventBus();
  const logError = vi.fn();
  const logWarn = vi.fn();
  const queue = new RunQueue((error) => {
    logError('queue', error);
  });
  const runs = new RunService({
    repository,
    artifacts: harness.artifacts,
    bus,
    queue,
    agent: harness.agent,
    llm: overrides.llm ?? harness.llm,
    policy: allowLocalShop,
    exporters: createDefaultExporters(),
    clock: harness.clock,
    ids: uuids,
    runTimeoutMs: overrides.runTimeoutMs ?? 60_000,
    logError,
    logWarn,
  });
  return { runs, repository, bus, queue, logError, logWarn, harness };
}

const START = { targetUrl: 'http://localhost:3000/demo-shop/stable', story: 'Order a kota' };

async function finished(runs: RunService, runId: string): Promise<TestRun> {
  return vi.waitFor(async () => {
    const { run } = await runs.get(runId);
    if (!TestRun.isFinal(run.status)) throw new Error('still running');
    return run;
  });
}

describe('RunService', () => {
  it('queues a run, executes it and stores every event', async () => {
    const { runs } = service();

    const queued = await runs.start({ ...START, targetLabel: ' Kota Express (stable) ' });
    const done = await finished(runs, queued.id);
    const { events } = await runs.get(queued.id);

    expect(queued).toMatchObject({ status: 'queued', targetLabel: 'Kota Express (stable)' });
    expect(queued.id).toMatch(UUID);
    expect(done.status).toBe('passed');
    expect(done.finishedAt).not.toBeNull();
    expect(events.map((event) => event.seq)).toEqual(events.map((_, index) => index + 1));
    expect(projectRun(events).status).toBe('passed');
    expect(await runs.list()).toHaveLength(1);
  });

  it('keeps the screen a run asked for, desktop by default', async () => {
    const { runs } = service();

    expect((await runs.start({ ...START, device: 'iphone' })).device).toBe('iphone');
    expect((await runs.start(START)).device).toBe('desktop');
  });

  it('knows which runs it still has', async () => {
    const { runs } = service();
    const queued = await runs.start(START);

    expect(await runs.exists(queued.id)).toBe(true);
    expect(await runs.exists('00000000-0000-4000-8000-00000000dead')).toBe(false);
  });

  it('labels a run from its URL when no label is given', async () => {
    const { runs } = service();

    expect((await runs.start(START)).targetLabel).toBe('localhost:3000/demo-shop/stable');
  });

  it('refuses targets the policy blocks, before anything is queued', async () => {
    const { runs } = service();

    await expect(runs.start({ targetUrl: 'http://169.254.169.254/' })).rejects.toBeInstanceOf(
      TargetBlockedError,
    );
    expect(await runs.list()).toHaveLength(0);
  });

  it('marks a failing run as failed with its bug', async () => {
    const { runs } = service({ pageText: 'Total R 70,00' });

    const run = await runs.start(START);

    expect((await finished(runs, run.id)).status).toBe('failed');
    expect(projectRun((await runs.get(run.id)).events).bugs).toHaveLength(1);
  });

  it('records a safe error when the language model fails', async () => {
    const { runs, logError, logWarn } = service({ llm: new FakeLanguageModel() });

    const run = await runs.start(START);

    expect((await finished(runs, run.id)).status).toBe('error');
    const view = projectRun((await runs.get(run.id)).events);
    expect(view.error).toEqual({ code: 'LLM_FAILED', message: 'No fake answer for plan' });
    expect(logError).not.toHaveBeenCalled();
    // The server log says why, so an outage on stage can be told apart from a bug.
    expect(logWarn).toHaveBeenCalledWith(`Run ${run.id} stopped`, {
      code: 'LLM_FAILED',
      cause: null,
    });
  });

  it("logs the provider's own reason when the model is down", async () => {
    const llm = new FakeLanguageModel().answer('plan', () => {
      throw new LlmError('The language model provider kept failing, even after a retry.', {
        cause: new Error('You exceeded your current quota'),
      });
    });
    const { runs, logWarn } = service({ llm });

    const run = await runs.start(START);
    await finished(runs, run.id);

    expect(logWarn).toHaveBeenCalledWith(`Run ${run.id} stopped`, {
      code: 'LLM_FAILED',
      cause: 'You exceeded your current quota',
    });
  });

  it('hides unexpected errors from the client and logs them', async () => {
    const llm = new FakeLanguageModel().answer('plan', () => {
      throw new TypeError('bug in our code');
    });
    const { runs, logError } = service({ llm });

    const run = await runs.start(START);

    await finished(runs, run.id);
    const view = projectRun((await runs.get(run.id)).events);
    expect(view.error?.code).toBe('INTERNAL');
    expect(logError).toHaveBeenCalledOnce();
  });

  it('stops a run that runs past its time limit', async () => {
    const slowModel = agentHarness().llm.slow(50);
    const { runs } = service({ runTimeoutMs: 5, llm: slowModel });

    const run = await runs.start(START);

    expect((await finished(runs, run.id)).status).toBe('error');
    expect(projectRun((await runs.get(run.id)).events).error?.code).toBe('RUN_CANCELLED');
  });

  it('runs one at a time and can cancel a waiting run', async () => {
    const { runs, queue } = service();

    const first = await runs.start(START);
    const second = await runs.start(START);
    expect(queue.activeRunId).toBe(first.id);
    expect(queue.pending).toBe(1);

    const cancelled = await runs.cancel(second.id);

    expect(cancelled.status).toBe('cancelled');
    expect((await runs.get(second.id)).events.map((event) => event.type)).toEqual([
      'run.cancelled',
    ]);
    expect((await finished(runs, first.id)).status).toBe('passed');
    expect((await runs.cancel(first.id)).status).toBe('passed');
  });

  it('stops the running run when asked', async () => {
    const { runs, bus } = service();
    const run = await runs.start(START);
    const unsubscribe = bus.subscribe(run.id, (event: RunEvent) => {
      if (event.type === 'plan.ready') void runs.cancel(run.id);
    });

    expect((await finished(runs, run.id)).status).toBe('cancelled');
    unsubscribe();
  });

  it('re-runs an earlier plan against another start page', async () => {
    const { runs, harness } = service();
    const original = await runs.start(START);
    await finished(runs, original.id);

    const rerun = await runs.start({
      targetUrl: 'http://localhost:3000/demo-shop/redesign',
      reusePlanFrom: original.id,
    });
    await finished(runs, rerun.id);

    const view = projectRun((await runs.get(rerun.id)).events);
    expect(view.scenarios[0]?.steps[0]?.value).toBe('/demo-shop/redesign');
    expect(harness.llm.requests).toHaveLength(1);
  });

  it('refuses to reuse a run that has no plan', async () => {
    const { runs } = service();
    const first = await runs.start(START);
    const second = await runs.start(START);
    await runs.cancel(second.id);

    await expect(runs.start({ ...START, reusePlanFrom: second.id })).rejects.toBeInstanceOf(
      ValidationError,
    );
    await finished(runs, first.id);
  });

  it('serves screenshots, events after a seq, and live subscriptions', async () => {
    const { runs } = service();
    const run = await runs.start(START);
    const live: number[] = [];
    const unsubscribe = runs.subscribe(run.id, (event) => live.push(event.seq));
    await finished(runs, run.id);
    unsubscribe();

    const { events } = await runs.get(run.id);
    const stepId = projectRun(events).scenarios[0]?.steps[0]?.id ?? '';

    expect((await runs.screenshot(run.id, stepId)).length).toBeGreaterThan(0);
    await expect(runs.screenshot(run.id, 'missing')).rejects.toBeInstanceOf(NotFoundError);
    expect(await runs.events(run.id, events.length - 1)).toHaveLength(1);
    expect(live).toEqual(events.map((event) => event.seq));
  });

  it('answers NotFound for unknown runs', async () => {
    const { runs } = service();
    const missing = '00000000-0000-4000-8000-999999999999';

    await expect(runs.get(missing)).rejects.toBeInstanceOf(NotFoundError);
    await expect(runs.events(missing)).rejects.toBeInstanceOf(NotFoundError);
    await expect(runs.cancel(missing)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('RunQueue', () => {
  it('reports jobs that throw and moves on', async () => {
    const onError = vi.fn();
    const queue = new RunQueue(onError);
    const ran: string[] = [];

    queue.enqueue({ runId: 'a', execute: () => Promise.reject(new Error('boom')) });
    queue.enqueue({
      runId: 'b',
      execute: () => {
        ran.push('b');
        return Promise.resolve();
      },
    });

    await vi.waitFor(() => expect(ran).toEqual(['b']));
    expect(onError).toHaveBeenCalledOnce();
    expect(queue.cancel('zzz')).toBe('unknown');
  });

  it('aborts the running job with a cancellation reason', async () => {
    const queue = new RunQueue(vi.fn());
    let seen: unknown;
    queue.enqueue({
      runId: 'a',
      execute: (signal) =>
        new Promise((resolve) => {
          signal.addEventListener('abort', () => {
            seen = signal.reason;
            resolve();
          });
        }),
    });

    expect(queue.cancel('a')).toBe('stopping');
    await vi.waitFor(() => expect(seen).toBeInstanceOf(RunCancelledError));
  });
});

describe('RunEmitter', () => {
  it('continues numbering from the last seq it is given', async () => {
    const repository = new InMemoryRunRepository();
    const { harness } = service();
    const emitter = new RunEmitter(
      '00000000-0000-4000-8000-000000000001',
      { repository, bus: new InMemoryEventBus(), clock: harness.clock },
      7,
    );

    await emitter.emit({ type: 'run.cancelled' });

    expect((await repository.events('00000000-0000-4000-8000-000000000001'))[0]?.seq).toBe(8);
  });
});

describe('RunService.export', () => {
  it('builds a report from the stored events, and refuses unknown formats', async () => {
    const { runs } = service();
    const run = await runs.start(START);
    await finished(runs, run.id);

    const report = await runs.export(run.id, 'junit');

    expect(report.body).toContain('<testsuites name="TestPilot" tests="1" failures="0"');
    await expect(runs.export(run.id, 'pdf' as never)).rejects.toBeInstanceOf(NotFoundError);
  });
});
