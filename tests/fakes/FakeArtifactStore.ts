import type { IArtifactStore } from '@/core/ports';

/** Keeps screenshots in memory, keyed `${runId}/${stepId}`. */
export class FakeArtifactStore implements IArtifactStore {
  readonly saved = new Map<string, Uint8Array>();

  saveScreenshot(runId: string, stepId: string, jpeg: Uint8Array): Promise<void> {
    this.saved.set(`${runId}/${stepId}`, jpeg);
    return Promise.resolve();
  }

  readScreenshot(runId: string, stepId: string): Promise<Uint8Array | null> {
    return Promise.resolve(this.saved.get(`${runId}/${stepId}`) ?? null);
  }
}
