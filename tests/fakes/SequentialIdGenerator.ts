import type { IIdGenerator } from '@/core/ports';

/** Predictable ids for assertions: `${prefix}-1`, `${prefix}-2`, ... */
export class SequentialIdGenerator implements IIdGenerator {
  private count = 0;

  constructor(private readonly prefix = 'id') {}

  next(): string {
    this.count += 1;
    return `${this.prefix}-${this.count}`;
  }
}
