import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FileArtifactStore } from '@/adapters/storage/FileArtifactStore';
import { ValidationError } from '@/core/errors';
import { FAKE_JPEG } from '../../../fakes/FakeBrowserSession';

const RUN = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const STEP = '16fd2706-8baf-433b-82eb-8c7fada847da';

describe('FileArtifactStore', () => {
  let dataDir: string;

  beforeEach(async () => {
    dataDir = await mkdtemp(join(tmpdir(), 'testpilot-artifacts-'));
  });

  afterEach(async () => {
    await rm(dataDir, { recursive: true, force: true });
  });

  it('writes screenshots under artifacts/<runId>/<stepId>.jpg and reads them back', async () => {
    const store = new FileArtifactStore(dataDir);

    await store.saveScreenshot(RUN, STEP, FAKE_JPEG);

    const onDisk = await readFile(join(dataDir, 'artifacts', RUN, `${STEP}.jpg`));
    expect(new Uint8Array(onDisk)).toEqual(FAKE_JPEG);
    expect(new Uint8Array((await store.readScreenshot(RUN, STEP)) ?? [])).toEqual(FAKE_JPEG);
  });

  it('returns null for a screenshot that was never taken', async () => {
    await expect(new FileArtifactStore(dataDir).readScreenshot(RUN, STEP)).resolves.toBeNull();
  });

  it.each([
    ['../../etc', STEP],
    [RUN, '..\\..\\secrets'],
    [RUN, 'step-1'],
  ])('refuses ids that are not UUIDs (%s, %s)', async (runId, stepId) => {
    const store = new FileArtifactStore(dataDir);

    await expect(store.saveScreenshot(runId, stepId, FAKE_JPEG)).rejects.toBeInstanceOf(
      ValidationError,
    );
    await expect(store.readScreenshot(runId, stepId)).rejects.toBeInstanceOf(ValidationError);
  });

  it('surfaces read errors other than a missing file', async () => {
    // A folder where the screenshot should be makes the read fail with EISDIR, not ENOENT.
    await mkdir(join(dataDir, 'artifacts', RUN, `${STEP}.jpg`), { recursive: true });

    await expect(new FileArtifactStore(dataDir).readScreenshot(RUN, STEP)).rejects.toThrow();
  });
});
