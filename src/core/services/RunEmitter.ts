import { RunEventSchema, type RunEventPayload } from '../domain';
import type { IClock, IEventBus, IRunRepository } from '../ports';
import type { EmitEvent } from '../agent/RunContext';

/**
 * Stamps a run's events with runId, a gap-free seq and the time, stores them, then publishes them.
 * Storing first means a subscriber that replays the log never misses an event it was sent.
 */
export class RunEmitter {
  private seq: number;

  constructor(
    private readonly runId: string,
    private readonly deps: Readonly<{ repository: IRunRepository; bus: IEventBus; clock: IClock }>,
    lastSeq = 0,
  ) {
    this.seq = lastSeq;
  }

  readonly emit: EmitEvent = async (payload: RunEventPayload) => {
    this.seq += 1;
    const event = RunEventSchema.parse({
      ...payload,
      runId: this.runId,
      seq: this.seq,
      at: this.deps.clock.now().toISOString(),
    });
    await this.deps.repository.appendEvent(event);
    this.deps.bus.publish(event);
  };
}
