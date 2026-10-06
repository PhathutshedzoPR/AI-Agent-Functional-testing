import { TERMINAL_EVENT_TYPES, TestRun, type RunEvent } from '@/core/domain';
import type { RunService } from '@/core/services';
import type { SseStart } from './sseResponse';

const HEARTBEAT_MS = 15_000;

/**
 * Streams a run's events: subscribe first, replay the stored log, then follow live events,
 * never sending a seq twice. Ends after the run's final event (CLAUDE.md section 6, events).
 */
export function runEventStream(runs: RunService, runId: string, afterSeq: number): SseStart {
  return async (sink) => {
    let lastSent = afterSeq;
    let replaying = true;
    const held: RunEvent[] = [];

    const deliver = (event: RunEvent): void => {
      if (event.seq <= lastSent) return;
      lastSent = event.seq;
      sink.send(event.seq, event);
      if (TERMINAL_EVENT_TYPES.has(event.type)) sink.close();
    };

    const unsubscribe = runs.subscribe(runId, (event) => {
      if (replaying) held.push(event);
      else deliver(event);
    });
    const { run, events } = await runs.get(runId);
    for (const event of events) deliver(event);
    replaying = false;
    for (const event of held.toSorted((a, b) => a.seq - b.seq)) deliver(event);

    // A run that ended before any terminal event existed (none should) still ends the stream.
    if (TestRun.isFinal(run.status) && events.length === 0) sink.close();

    const heartbeat = setInterval(() => sink.comment('still here'), HEARTBEAT_MS);
    return () => {
      clearInterval(heartbeat);
      unsubscribe();
    };
  };
}
