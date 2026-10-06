import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { ValidationError } from '@/core/errors';
import type { IArtifactStore } from '@/core/ports';

const UUID = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;

/**
 * Screenshots on disk at `<dataDir>/artifacts/<runId>/<stepId>.jpg` (CLAUDE.md section 4,
 * item 7). Paths are built only from UUIDs, never from user-supplied text.
 */
export class FileArtifactStore implements IArtifactStore {
  private readonly root: string;

  constructor(dataDir: string) {
    this.root = resolve(dataDir, 'artifacts');
  }

  async saveScreenshot(runId: string, stepId: string, jpeg: Uint8Array): Promise<void> {
    const path = this.screenshotPath(runId, stepId);
    await mkdir(join(this.root, runId), { recursive: true });
    await writeFile(path, jpeg);
  }

  async readScreenshot(runId: string, stepId: string): Promise<Uint8Array | null> {
    try {
      return await readFile(this.screenshotPath(runId, stepId));
    } catch (error) {
      if (isMissingFile(error)) return null;
      throw error;
    }
  }

  private screenshotPath(runId: string, stepId: string): string {
    if (!UUID.test(runId) || !UUID.test(stepId)) {
      throw new ValidationError('Artifact ids must be UUIDs.');
    }
    const path = resolve(this.root, runId, `${stepId}.jpg`);
    // Defence in depth: the checks above already make traversal impossible.
    if (!path.startsWith(this.root + sep)) {
      throw new ValidationError('Artifact path escaped the artifact folder.');
    }
    return path;
  }
}

function isMissingFile(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}
