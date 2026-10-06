import { describe, expect, it } from 'vitest';
import { CryptoIdGenerator, SystemClock } from '@/adapters/system';

describe('SystemClock', () => {
  it('reports wall time and a monotonic counter that never goes back', () => {
    const clock = new SystemClock();
    const before = Date.now();
    const first = clock.monotonicMs();

    expect(clock.now().getTime()).toBeGreaterThanOrEqual(before);
    expect(clock.monotonicMs()).toBeGreaterThanOrEqual(first);
  });
});

describe('CryptoIdGenerator', () => {
  it('produces distinct v4 UUIDs', () => {
    const ids = new CryptoIdGenerator();
    const generated = new Set(Array.from({ length: 50 }, () => ids.next()));

    expect(generated.size).toBe(50);
    for (const id of generated) {
      expect(id).toMatch(/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/);
    }
  });
});
