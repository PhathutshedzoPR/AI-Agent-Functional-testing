/** Binary artefacts of a run. Callers pass validated IDs only; never user-supplied paths. */
export interface IArtifactStore {
  saveScreenshot(runId: string, stepId: string, jpeg: Uint8Array): Promise<void>;
  readScreenshot(runId: string, stepId: string): Promise<Uint8Array | null>;
}
