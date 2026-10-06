import type { RunContext } from '@/core/agent/RunContext';
import type { RunEventPayload } from '@/core/domain';
import { RUN_ID } from './domainBuilders';

/** A RunContext whose emitted events are collected in `events`. */
export function recordingContext(
  overrides: Partial<RunContext> = {},
): RunContext & { events: RunEventPayload[] } {
  const events: RunEventPayload[] = [];
  return {
    runId: RUN_ID,
    start: new URL('http://localhost:3000/demo-shop/stable'),
    signal: new AbortController().signal,
    emit: (payload) => {
      events.push(payload);
      return Promise.resolve();
    },
    ...overrides,
    events,
  };
}
