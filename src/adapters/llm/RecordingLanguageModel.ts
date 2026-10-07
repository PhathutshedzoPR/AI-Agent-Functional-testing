import type { z } from 'zod';
import type { ILanguageModel, LlmRequest } from '@/core/ports';
import { ReplayStore } from './ReplayStore';

/**
 * Saves every response of the wrapped model for later replay (Decorator). A request that was
 * already recorded word for word is answered from its recording, so re-running the recorder
 * spends provider calls (20 a day per model on Gemini's free tier) only on what is new.
 */
export class RecordingLanguageModel implements ILanguageModel {
  constructor(
    private readonly inner: ILanguageModel,
    private readonly store: ReplayStore,
  ) {}

  get replayed(): boolean {
    return this.inner.replayed;
  }

  async generateObject<S extends z.ZodType>(request: LlmRequest<S>): Promise<z.infer<S>> {
    const recorded = await this.store.read(ReplayStore.key(request));
    const reused = recorded ? request.schema.safeParse(recorded.output) : null;
    if (reused?.success) return reused.data;

    const output = await this.inner.generateObject(request);
    await this.store.write(ReplayStore.key(request), {
      purpose: request.purpose,
      system: request.system,
      prompt: request.prompt,
      output,
    });
    return output;
  }
}
