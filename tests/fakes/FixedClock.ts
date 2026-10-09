import type { IClock } from '@/core/ports';

/** A clock tests move by hand. Wall time and monotonic time advance together. */
export class FixedClock implements IClock {
  private wallMs: number;
  private monotonic = 0;

  constructor(start = '2026-10-06T08:00:00.000Z') {
    this.wallMs = Date.parse(start);
  }

  now(): Date {
    return new Date(this.wallMs);
  }

  monotonicMs(): number {
    return this.monotonic;
  }

  advance(ms: number): void {
    this.wallMs += ms;
    this.monotonic += ms;
  }
}
