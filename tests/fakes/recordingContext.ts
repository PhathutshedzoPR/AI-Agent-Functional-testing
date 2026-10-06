import type { ExecutionContext } from '@/core/agent/RunContext';
import type { RunEventPayload } from '@/core/domain';
import { RUN_ID } from './domainBuilders';
import { FakeLanguageModel } from './FakeLanguageModel';

/** A RunContext whose emitted events are collected in `events`. */
export function recordingContext(
  overrides: Partial<ExecutionContext> = {},
): ExecutionContext & { events: RunEventPayload[] } {
  const events: RunEventPayload[] = [];
  return {
    runId: RUN_ID,
    start: new URL('http://localhost:3000/demo-shop/stable'),
    signal: new AbortController().signal,
    llm: new FakeLanguageModel(),
    explored: new Set<string>(),
    emit: (payload) => {
      events.push(payload);
      return Promise.resolve();
    },
    ...overrides,
    events,
  };
}
