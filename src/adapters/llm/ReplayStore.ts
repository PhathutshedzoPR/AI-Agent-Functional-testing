import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { z } from 'zod';
import type { LlmPurpose, LlmRequest } from '@/core/ports';

const ReplayRecordSchema = z.object({
  purpose: z.string(),
  system: z.string(),
  prompt: z.string(),
  output: z.unknown(),
});

export type ReplayRecord = z.infer<typeof ReplayRecordSchema>;

/**
 * Recorded LLM responses on disk, one JSON file per request, named by the SHA-256 of purpose,
 * system prompt and prompt. Prompts are deterministic, so the same request finds the same file.
 */
export class ReplayStore {
  private readonly dir: string;

  constructor(dir: string) {
    this.dir = resolve(dir);
  }

  static key(request: Pick<LlmRequest<z.ZodType>, 'purpose' | 'system' | 'prompt'>): string {
    return createHash('sha256')
      .update(JSON.stringify([request.purpose, request.system, request.prompt]))
      .digest('hex');
  }

  async read(key: string): Promise<ReplayRecord | null> {
    let raw: string;
    try {
      raw = await readFile(this.path(key), 'utf8');
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return null;
      throw error;
    }
    return ReplayRecordSchema.parse(JSON.parse(raw));
  }

  async write(
    key: string,
    record: Readonly<{ purpose: LlmPurpose; system: string; prompt: string; output: unknown }>,
  ): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    await writeFile(this.path(key), `${JSON.stringify(record, null, 2)}\n`, 'utf8');
  }

  /**
   * The first recording for `purpose` whose prompt contains every one of `lines`. Used when an
   * exact match is missing because live page details shifted between recording and replay.
   */
  async findByPromptLines(
    purpose: LlmPurpose,
    lines: readonly string[],
  ): Promise<ReplayRecord | null> {
    let names: string[];
    try {
      names = await readdir(this.dir);
    } catch {
      return null; // no recordings folder yet means nothing to find
    }
    const recordings = names
      .filter((file) => /^[\da-f]{64}\.json$/.test(file))
      .sort((a, b) => a.localeCompare(b));
    for (const name of recordings) {
      const record = await this.read(name.slice(0, 64));
      if (record?.purpose === purpose && lines.every((line) => record.prompt.includes(line))) {
        return record;
      }
    }
    return null;
  }

  private path(key: string): string {
    if (!/^[\da-f]{64}$/.test(key)) {
      throw new Error('Replay keys are SHA-256 hex digests.');
    }
    return join(this.dir, `${key}.json`);
  }
}
