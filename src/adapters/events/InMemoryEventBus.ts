import type { RunEvent } from '@/core/domain';
import type { IEventBus, RunEventListener, Unsubscribe } from '@/core/ports';

/** Delivers run events to live subscribers in this process (Observer). */
export class InMemoryEventBus implements IEventBus {
  private readonly listeners = new Map<string, Set<RunEventListener>>();

  publish(event: RunEvent): void {
    for (const listener of [...(this.listeners.get(event.runId) ?? [])]) {
      try {
        listener(event);
      } catch {
        // A subscriber that throws (usually a closed stream) is dropped so others still hear.
        this.remove(event.runId, listener);
      }
    }
  }

  subscribe(runId: string, listener: RunEventListener): Unsubscribe {
    const set = this.listeners.get(runId) ?? new Set<RunEventListener>();
    set.add(listener);
    this.listeners.set(runId, set);
    return () => this.remove(runId, listener);
  }

  listenerCount(runId: string): number {
    return this.listeners.get(runId)?.size ?? 0;
  }

  private remove(runId: string, listener: RunEventListener): void {
    const set = this.listeners.get(runId);
    set?.delete(listener);
    if (set?.size === 0) this.listeners.delete(runId);
  }
}
