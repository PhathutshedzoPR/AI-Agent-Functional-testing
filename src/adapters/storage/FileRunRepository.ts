import { appendFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { RunEventSchema, TestRun, TestRunSchema, type RunEvent } from '@/core/domain';
import type { IRunRepository } from '@/core/ports';
import { idPath, isMissingFile } from './fileSafety';
import { InMemoryRunRepository } from './InMemoryRunRepository';

const RUN_FILE = /^([\da-f-]{36})\.json$/i;
const INTERRUPTED = {
  code: 'INTERNAL',
  message: 'The server restarted while this run was going. Start it again.',
};

/**
 * Runs kept in memory for speed and on disk under `<dataDir>/runs`, so history survives a restart
 * (Repository). Each run is `<runId>.json`, rewritten on every save, and `<runId>.events.jsonl`,
 * one event per line, append only. Views are rebuilt from the events as before.
 */
export class FileRunRepository implements IRunRepository {
  private readonly dir: string;
  private readonly memory = new InMemoryRunRepository();
  private loading: Promise<void> | null = null;

  constructor(
    dataDir: string,
    private readonly now: () => Date = () => new Date(),
  ) {
    this.dir = resolve(dataDir, 'runs');
  }

  async save(run: TestRun): Promise<void> {
    await this.ready();
    await this.memory.save(run);
    await this.write(run);
  }

  async get(runId: string): Promise<TestRun | null> {
    await this.ready();
    return this.memory.get(runId);
  }

  async list(limit: number): Promise<readonly TestRun[]> {
    await this.ready();
    return this.memory.list(limit);
  }

  async appendEvent(event: RunEvent): Promise<void> {
    await this.ready();
    await this.memory.appendEvent(event);
    await this.append(event);
  }

  async events(runId: string, afterSeq = 0): Promise<readonly RunEvent[]> {
    await this.ready();
    return this.memory.events(runId, afterSeq);
  }

  private ready(): Promise<void> {
    this.loading ??= this.load();
    return this.loading;
  }

  private async load(): Promise<void> {
    let names: string[];
    try {
      names = await readdir(this.dir);
    } catch (error) {
      if (isMissingFile(error)) return;
      throw error;
    }
    for (const name of names) {
      const runId = RUN_FILE.exec(name)?.[1];
      if (runId) await this.restore(runId);
    }
  }

  private async restore(runId: string): Promise<void> {
    const run = TestRunSchema.safeParse(await readJson(this.path(runId, 'json')));
    // A file that no longer parses (hand-edited, half-written) is skipped, not fatal.
    if (!run.success) return;
    const events = await this.readEvents(runId);
    for (const event of events) await this.memory.appendEvent(event);
    if (TestRun.isFinal(run.data.status)) {
      await this.memory.save(run.data);
      return;
    }
    // The browser that was running it died with the server: say so instead of spinning forever.
    const at = this.now();
    const failed = RunEventSchema.parse({
      type: 'run.failed',
      runId,
      seq: (events.at(-1)?.seq ?? 0) + 1,
      at: at.toISOString(),
      error: INTERRUPTED,
    });
    await this.memory.appendEvent(failed);
    await this.append(failed);
    const stopped = TestRun.transition(run.data, 'error', at);
    await this.memory.save(stopped);
    await this.write(stopped);
  }

  private async readEvents(runId: string): Promise<RunEvent[]> {
    let text: string;
    try {
      text = await readFile(this.path(runId, 'events.jsonl'), 'utf8');
    } catch (error) {
      if (isMissingFile(error)) return [];
      throw error;
    }
    return text.split('\n').flatMap((line) => {
      const parsed = RunEventSchema.safeParse(parseJson(line));
      return parsed.success ? [parsed.data] : [];
    });
  }

  private async write(run: TestRun): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    await writeFile(this.path(run.id, 'json'), `${JSON.stringify(run)}\n`, 'utf8');
  }

  private async append(event: RunEvent): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    await appendFile(this.path(event.runId, 'events.jsonl'), `${JSON.stringify(event)}\n`, 'utf8');
  }

  private path(runId: string, extension: string): string {
    return idPath(this.dir, [runId], (id) => `${id}.${extension}`);
  }
}

async function readJson(path: string): Promise<unknown> {
  try {
    return parseJson(await readFile(path, 'utf8'));
  } catch (error) {
    if (isMissingFile(error)) return null;
    throw error;
  }
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    // Not JSON (a torn last line, say): the caller's schema check then rejects it.
    return null;
  }
}
