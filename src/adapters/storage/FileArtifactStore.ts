import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { IArtifactStore } from '@/core/ports';
import { idPath, isMissingFile } from './fileSafety';

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
    return idPath(this.root, [runId, stepId], (stepFile) => `${stepFile}.jpg`);
  }
}
