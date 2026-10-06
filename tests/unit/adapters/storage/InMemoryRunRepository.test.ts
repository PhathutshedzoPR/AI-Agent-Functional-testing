import { describe, expect, it, vi } from 'vitest';
import { InMemoryEventBus } from '@/adapters/events';
import { InMemoryRunRepository } from '@/adapters/storage';
import { aRun } from '../../../fakes/domainBuilders';
import { stamp } from '../../../fakes/eventBuilders';

const ID = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const at = (minute: number): string => new Date(Date.UTC(2026, 9, 6, 8, minute)).toISOString();

describe('InMemoryRunRepository', () => {
  it('saves, updates and lists runs newest first', async () => {
    const repo = new InMemoryRunRepository();
    await repo.save(aRun({ id: ID(1), createdAt: at(1) }));
    await repo.save(aRun({ id: ID(2), createdAt: at(2) }));
    await repo.save(aRun({ id: ID(1), createdAt: at(1), status: 'running' }));

    expect((await repo.list(10)).map((run) => run.id)).toEqual([ID(2), ID(1)]);
    expect((await repo.list(1)).map((run) => run.id)).toEqual([ID(2)]);
    expect((await repo.get(ID(1)))?.status).toBe('running');
    expect(await repo.get(ID(9))).toBeNull();
  });

  it('keeps events per run and returns those after a sequence number', async () => {
    const repo = new InMemoryRunRepository();
    for (const event of stamp([{ type: 'run.cancelled' }, { type: 'run.cancelled' }])) {
      await repo.appendEvent(event);
    }

    expect((await repo.events(aRun().id)).map((event) => event.seq)).toEqual([1, 2]);
    expect((await repo.events(aRun().id, 1)).map((event) => event.seq)).toEqual([2]);
    expect(await repo.events(ID(9))).toEqual([]);
  });

  it('drops the oldest finished runs past its limit, never active ones', async () => {
    const repo = new InMemoryRunRepository(2);
    await repo.save(aRun({ id: ID(1), createdAt: at(1), status: 'running' }));
    await repo.save(aRun({ id: ID(2), createdAt: at(2), status: 'passed' }));
    await repo.save(aRun({ id: ID(3), createdAt: at(3), status: 'failed' }));

    expect((await repo.list(10)).map((run) => run.id)).toEqual([ID(3), ID(1)]);
  });
});

describe('InMemoryEventBus', () => {
  const [event] = stamp([{ type: 'run.cancelled' }]);

  it('delivers events to the run’s subscribers until they unsubscribe', () => {
    const bus = new InMemoryEventBus();
    const listener = vi.fn();
    const other = vi.fn();
    const unsubscribe = bus.subscribe(aRun().id, listener);
    bus.subscribe(ID(9), other);

    if (event) bus.publish(event);
    unsubscribe();
    if (event) bus.publish(event);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(other).not.toHaveBeenCalled();
    expect(bus.listenerCount(aRun().id)).toBe(0);
  });

  it('drops a subscriber that throws and keeps delivering to the rest', () => {
    const bus = new InMemoryEventBus();
    const healthy = vi.fn();
    bus.subscribe(aRun().id, () => {
      throw new Error('stream closed');
    });
    bus.subscribe(aRun().id, healthy);

    if (event) bus.publish(event);

    expect(healthy).toHaveBeenCalledTimes(1);
    expect(bus.listenerCount(aRun().id)).toBe(1);
  });
});
