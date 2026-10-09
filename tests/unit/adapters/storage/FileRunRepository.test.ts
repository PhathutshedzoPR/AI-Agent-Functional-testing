import { appendFile, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FileRunRepository } from '@/adapters/storage';
import { projectRun } from '@/core/domain';
import { aRun } from '../../../fakes/domainBuilders';
import { stamp } from '../../../fakes/eventBuilders';

const RESTART = new Date('2026-10-10T08:00:00.000Z');

describe('FileRunRepository', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'testpilot-runs-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('starts empty, then keeps runs and events across a restart', async () => {
    const before = new FileRunRepository(dir);
    expect(await before.list(10)).toEqual([]);
    await before.save(aRun({ status: 'passed', finishedAt: '2026-10-06T08:01:00.000Z' }));
    for (const event of stamp([{ type: 'run.cancelled' }])) await before.appendEvent(event);

    const after = new FileRunRepository(dir);

    expect((await after.list(10)).map((run) => run.status)).toEqual(['passed']);
    expect((await after.events(aRun().id)).map((event) => event.type)).toEqual(['run.cancelled']);
  });

  it('marks a run the restart interrupted as stopped, with the reason in its events', async () => {
    const before = new FileRunRepository(dir);
    await before.save(aRun({ status: 'running' }));
    for (const event of stamp([{ type: 'run.cancelled' }])) await before.appendEvent(event);

    const after = new FileRunRepository(dir, () => RESTART);
    const run = await after.get(aRun().id);
    const view = projectRun(await after.events(aRun().id));

    expect(run).toMatchObject({ status: 'error', finishedAt: RESTART.toISOString() });
    expect(view.error?.message).toContain('The server restarted');
    // The interruption is written down too, so a second restart does not repeat it.
    expect((await new FileRunRepository(dir).events(aRun().id)).map((e) => e.seq)).toEqual([1, 2]);
  });

  it('skips files it cannot read instead of failing to start', async () => {
    const runs = join(dir, 'runs');
    await new FileRunRepository(dir).save(aRun({ status: 'passed' }));
    await writeFile(join(runs, '00000000-0000-4000-8000-0000000000ff.json'), '{ not json');
    await writeFile(join(runs, 'notes.txt'), 'ignored');
    await appendFile(join(runs, `${aRun().id}.events.jsonl`), 'half a line\n');

    const after = new FileRunRepository(dir);

    expect(await after.list(10)).toHaveLength(1);
    expect(await after.events(aRun().id)).toEqual([]);
  });

  it('never builds a path from anything but a UUID', async () => {
    await expect(new FileRunRepository(dir).save(aRun({ id: '../../etc' }))).rejects.toThrow(
      'UUIDs',
    );
  });
});
