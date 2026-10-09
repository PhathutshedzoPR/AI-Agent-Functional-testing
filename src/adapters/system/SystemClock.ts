import type { IClock } from '@/core/ports';

export class SystemClock implements IClock {
  now(): Date {
    return new Date();
  }

  monotonicMs(): number {
    return performance.now();
  }
}
