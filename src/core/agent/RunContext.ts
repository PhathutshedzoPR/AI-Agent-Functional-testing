import type { RunEventPayload } from '../domain';
import type { ILanguageModel } from '../ports';

/** Publishes one event of the current run; the emitter stamps runId, seq and time. */
export type EmitEvent = (payload: RunEventPayload) => Promise<void>;

/** What every stage of one run shares. */
export type RunContext = Readonly<{
  runId: string;
  /** The URL the run started from. Navigation never leaves its origin. */
  start: URL;
  emit: EmitEvent;
  signal: AbortSignal;
}>;

/** What the executor and healer get on top: the run's budgeted model and the pages it explored. */
export type ExecutionContext = RunContext &
  Readonly<{
    llm: ILanguageModel;
    explored: ReadonlySet<string>;
  }>;
