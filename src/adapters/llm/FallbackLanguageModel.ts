import type { z } from 'zod';
import { LlmError } from '@/core/errors';
import type { ILanguageModel, LlmRequest } from '@/core/ports';

export type NamedModel = Readonly<{ name: string; model: ILanguageModel }>;

export type FallbackListener = (from: string, to: string, error: LlmError) => void;

/**
 * Asks each model in turn until one answers (Chain of Responsibility): the main model first, then
 * the backups, so an overloaded or out-of-quota provider does not stop a run. Only model failures
 * move on; anything else is a bug and surfaces at once. The run's call budget still counts one
 * call, because the budget wraps this whole chain.
 */
export class FallbackLanguageModel implements ILanguageModel {
  readonly replayed = false;

  constructor(
    private readonly models: readonly NamedModel[],
    private readonly onFallback: FallbackListener = () => undefined,
  ) {}

  async generateObject<S extends z.ZodType>(request: LlmRequest<S>): Promise<z.infer<S>> {
    let lastError = new LlmError('No language model is configured.');
    for (const [index, { name, model }] of this.models.entries()) {
      try {
        return await model.generateObject(request);
      } catch (error) {
        if (!(error instanceof LlmError)) throw error;
        lastError = error;
        const next = this.models[index + 1];
        if (next) this.onFallback(name, next.name, error);
      }
    }
    throw lastError;
  }
}
