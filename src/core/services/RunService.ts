import { rebasePlan } from '../agent/rebasePlan';
import type { TestAgent } from '../agent/TestAgent';
import {
  TestRun,
  projectRun,
  type ExportFormat,
  type RunEvent,
  type RunStatus,
  type TestPlan,
} from '../domain';
import { AppError, NotFoundError, RunCancelledError, ValidationError } from '../errors';
import type {
  IArtifactStore,
  IClock,
  ExportedReport,
  IEventBus,
  IIdGenerator,
  ILanguageModel,
  IReportExporter,
  IRunRepository,
  ITargetPolicy,
  RunEventListener,
  Unsubscribe,
} from '../ports';
import { RunEmitter } from './RunEmitter';
import type { RunQueue } from './RunQueue';

export type StartRunInput = Readonly<{
  targetUrl: string;
  targetLabel?: string;
  story?: string | null;
  /** Re-run the plan of this earlier run instead of planning afresh. */
  reusePlanFrom?: string | null;
}>;

export type RunServiceDependencies = Readonly<{
  repository: IRunRepository;
  artifacts: IArtifactStore;
  bus: IEventBus;
  queue: RunQueue;
  agent: TestAgent;
  llm: ILanguageModel;
  policy: ITargetPolicy;
  clock: IClock;
  ids: IIdGenerator;
  exporters: readonly IReportExporter[];
  runTimeoutMs: number;
  logError: (message: string, error: unknown) => void;
}>;

const INTERNAL_ERROR = {
  code: 'INTERNAL',
  message: 'Something went wrong while running the test. Try again.',
};

/** The application's use cases for runs. Route handlers and the CLI call these and nothing else. */
export class RunService {
  constructor(private readonly deps: RunServiceDependencies) {}

  async start(input: StartRunInput): Promise<TestRun> {
    const start = await this.deps.policy.assertAllowed(input.targetUrl);
    const savedPlan = input.reusePlanFrom
      ? await this.planToReuse(input.reusePlanFrom, start)
      : null;
    const run = TestRun.create({
      id: this.deps.ids.next(),
      targetUrl: start.href,
      targetLabel: input.targetLabel?.trim() || `${start.host}${start.pathname}`,
      story: input.story ?? null,
      status: 'queued',
      replayed: this.deps.llm.replayed,
      createdAt: this.deps.clock.now().toISOString(),
      finishedAt: null,
    });
    await this.deps.repository.save(run);
    this.deps.queue.enqueue({
      runId: run.id,
      execute: (signal) => this.execute(run, start, savedPlan, signal),
    });
    return run;
  }

  async get(runId: string): Promise<Readonly<{ run: TestRun; events: readonly RunEvent[] }>> {
    const run = await this.requireRun(runId);
    return { run, events: await this.deps.repository.events(runId) };
  }

  /** Runs live only as long as the repository keeps them (in memory, until a restart). */
  async exists(runId: string): Promise<boolean> {
    return (await this.deps.repository.get(runId)) !== null;
  }

  list(limit = 50): Promise<readonly TestRun[]> {
    return this.deps.repository.list(limit);
  }

  async events(runId: string, afterSeq = 0): Promise<readonly RunEvent[]> {
    await this.requireRun(runId);
    return this.deps.repository.events(runId, afterSeq);
  }

  subscribe(runId: string, listener: RunEventListener): Unsubscribe {
    return this.deps.bus.subscribe(runId, listener);
  }

  async cancel(runId: string): Promise<TestRun> {
    const run = await this.requireRun(runId);
    if (TestRun.isFinal(run.status)) return run;
    if (this.deps.queue.cancel(runId) === 'removed') {
      await this.emitterFor(runId, 0).emit({ type: 'run.cancelled' });
      return this.transition(runId, 'cancelled');
    }
    return run;
  }

  /** A report of the run in , built from its events like the dashboard. */
  async export(runId: string, format: ExportFormat): Promise<ExportedReport> {
    const exporter = this.deps.exporters.find((candidate) => candidate.format === format);
    if (!exporter) throw new NotFoundError(`The ${format} export`);
    const { events } = await this.get(runId);
    return exporter.export(projectRun(events));
  }

  async screenshot(runId: string, stepId: string): Promise<Uint8Array> {
    await this.requireRun(runId);
    const jpeg = await this.deps.artifacts.readScreenshot(runId, stepId);
    if (!jpeg) throw new NotFoundError('Screenshot');
    return jpeg;
  }

  private async execute(
    run: TestRun,
    start: URL,
    savedPlan: TestPlan | null,
    cancel: AbortSignal,
  ): Promise<void> {
    const timeout = new AbortController();
    const timer = setTimeout(
      () => timeout.abort(new RunCancelledError('timeout')),
      this.deps.runTimeoutMs,
    );
    const signal = AbortSignal.any([cancel, timeout.signal]);
    const emitter = this.emitterFor(run.id, 0);
    try {
      await this.transition(run.id, 'running');
      const request = { targetLabel: run.targetLabel, story: run.story, savedPlan };
      const context = { runId: run.id, start, emit: emitter.emit, signal };
      await this.transition(run.id, await this.deps.agent.run(request, this.deps.llm, context));
    } catch (error) {
      await this.recordFailure(run.id, emitter, error);
    } finally {
      clearTimeout(timer);
    }
  }

  private async recordFailure(runId: string, emitter: RunEmitter, error: unknown): Promise<void> {
    if (error instanceof RunCancelledError && error.reason === 'cancelled') {
      await emitter.emit({ type: 'run.cancelled' });
      await this.transition(runId, 'cancelled');
      return;
    }
    if (!(error instanceof AppError)) this.deps.logError(`Run ${runId} failed unexpectedly`, error);
    const safe =
      error instanceof AppError ? { code: error.code, message: error.message } : INTERNAL_ERROR;
    await emitter.emit({ type: 'run.failed', error: safe });
    await this.transition(runId, 'error');
  }

  private async planToReuse(runId: string, start: URL): Promise<TestPlan> {
    const source = await this.requireRun(runId);
    const events = await this.deps.repository.events(runId);
    const ready = events.find((event) => event.type === 'plan.ready');
    if (ready?.type !== 'plan.ready') {
      throw new ValidationError('That run has no plan to reuse yet.');
    }
    return rebasePlan(ready.plan, new URL(source.targetUrl), start, this.deps.ids);
  }

  private emitterFor(runId: string, lastSeq: number): RunEmitter {
    return new RunEmitter(runId, this.deps, lastSeq);
  }

  private async transition(runId: string, status: RunStatus): Promise<TestRun> {
    const run = await this.requireRun(runId);
    const next = TestRun.transition(run, status, this.deps.clock.now());
    await this.deps.repository.save(next);
    return next;
  }

  private async requireRun(runId: string): Promise<TestRun> {
    const run = await this.deps.repository.get(runId);
    if (!run) throw new NotFoundError('Run');
    return run;
  }
}
