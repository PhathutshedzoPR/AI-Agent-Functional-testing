import type { RunEvent } from '../domain';

export type RunEventListener = (event: RunEvent) => void;
export type Unsubscribe = () => void;

/** Publishes run events to live subscribers such as the SSE route (Observer). */
export interface IEventBus {
  publish(event: RunEvent): void;
  subscribe(runId: string, listener: RunEventListener): Unsubscribe;
}
