import type { z } from 'zod';
import type { ILanguageModel, LlmRequest } from '@/core/ports';
import { ReplayStore } from './ReplayStore';

/** Saves every response of the wrapped model for later replay (Decorator). */
export class RecordingLanguageModel implements ILanguageModel {
  constructor(
    private readonly inner: ILanguageModel,
    private readonly store: ReplayStore,
  ) {}

  get replayed(): boolean {
    return this.inner.replayed;
  }

  async generateObject<S extends z.ZodType>(request: LlmRequest<S>): Promise<z.infer<S>> {
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
