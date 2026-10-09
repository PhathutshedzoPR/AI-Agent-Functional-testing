export interface IClock {
  now(): Date;
  /** Monotonic milliseconds for measuring durations; unaffected by wall-clock changes. */
  monotonicMs(): number;
}
