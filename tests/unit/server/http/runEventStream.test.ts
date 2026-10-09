import { describe, expect, it } from 'vitest';
import type { RunEvent, RunEventPayload } from '@/core/domain';
import type { RunEventListener } from '@/core/ports';
import type { RunService } from '@/core/services';
import { SSE_HEADERS, runEventStream, sseResponse } from '@/server/http';
import { aRun } from '../../../fakes/domainBuilders';
import { stamp } from '../../../fakes/eventBuilders';

const step: RunEventPayload = { type: 'llm.called', purpose: 'plan', used: 1, max: 4 };
const finish: RunEventPayload = { type: 'run.finished', status: 'passed', durationMs: 5 };

/** A RunService stand-in with a stored log and a live publish hook. */
function fakeRuns(stored: RunEvent[], status: 'running' | 'passed' = 'running') {
  let listener: RunEventListener | null = null;
  const runs = {
    get: () => Promise.resolve({ run: aRun({ status }), events: stored }),
    subscribe: (_runId: string, l: RunEventListener) => {
      listener = l;
      return () => {
        listener = null;
      };
    },
  } as unknown as RunService;
  return {
    runs,
    publish: (event: RunEvent) => listener?.(event),
    subscribed: () => listener !== null,
  };
}

async function readAll(response: Response): Promise<string> {
  return new Response(response.body).text();
}

const seqs = (body: string): number[] =>
  [...body.matchAll(/^id: (\d+)$/gm)].map((match) => Number(match[1]));

describe('runEventStream over SSE', () => {
  it('replays the stored log, then streams live events, and ends after the last one', async () => {
    const events = stamp([step, step, step, finish]);
    const fake = fakeRuns(events.slice(0, 2));
    const response = sseResponse(
      runEventStream(fake.runs, aRun().id, 0),
      new AbortController().signal,
    );
    const reading = readAll(response);

    await new Promise((resolve) => setTimeout(resolve, 0));
    for (const event of events.slice(1)) fake.publish(event);
    const body = await reading;

    expect(response.headers.get('Content-Type')).toBe(SSE_HEADERS['Content-Type']);
    expect(seqs(body)).toEqual([1, 2, 3, 4]);
    expect(body).toContain('"type":"run.finished"');
    expect(fake.subscribed()).toBe(false);
  });

  it('skips what the client already has after a reconnect', async () => {
    const fake = fakeRuns(stamp([step, step, finish]));

    const body = await readAll(
      sseResponse(runEventStream(fake.runs, aRun().id, 2), new AbortController().signal),
    );

    expect(seqs(body)).toEqual([3]);
  });

  it('holds live events that arrive during the replay and sends them in order', async () => {
    const events = stamp([step, step, finish]);
    const fake = fakeRuns(events.slice(0, 1));
    const get = fake.runs.get.bind(fake.runs);
    fake.runs.get = async (runId: string) => {
      fake.publish(events[2] as RunEvent);
      fake.publish(events[1] as RunEvent);
      return get(runId);
    };

    const body = await readAll(
      sseResponse(runEventStream(fake.runs, aRun().id, 0), new AbortController().signal),
    );

    expect(seqs(body)).toEqual([1, 2, 3]);
  });

  it('stops and unsubscribes when the client disconnects', async () => {
    const fake = fakeRuns(stamp([step]));
    const controller = new AbortController();
    const reading = readAll(
      sseResponse(runEventStream(fake.runs, aRun().id, 0), controller.signal),
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
    controller.abort();

    expect(seqs(await reading)).toEqual([1]);
    expect(fake.subscribed()).toBe(false);
  });

  it('ends at once for a finished run with no events', async () => {
    const fake = fakeRuns([], 'passed');

    const body = await readAll(
      sseResponse(runEventStream(fake.runs, aRun().id, 0), new AbortController().signal),
    );

    expect(body).toBe('');
  });

  it('writes comments without breaking the event framing', async () => {
    const response = sseResponse((sink) => {
      sink.comment('line one\nline two');
      sink.close();
      sink.send(1, 'ignored after close');
      return Promise.resolve(() => undefined);
    }, new AbortController().signal);

    expect(await readAll(response)).toBe(': line one line two\n\n');
  });
});
