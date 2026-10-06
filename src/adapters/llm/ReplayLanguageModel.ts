import type { z } from 'zod';
import { LlmError } from '@/core/errors';
import type { ILanguageModel, LlmRequest } from '@/core/ports';
import { ReplayStore } from './ReplayStore';

/**
 * Serves recorded responses instead of calling a provider. Only the plan text is replayed; the
 * browser still runs every step for real.
 */
export class ReplayLanguageModel implements ILanguageModel {
  readonly replayed = true;

  constructor(private readonly store: ReplayStore) {}

  async generateObject<S extends z.ZodType>(request: LlmRequest<S>): Promise<z.infer<S>> {
    const record = await this.store.read(ReplayStore.key(request));
    if (!record) {
      throw new LlmError(
        `No recorded ${request.purpose} response matches this request. Record it with npm run replays:record, or use a live provider.`,
      );
    }
    const parsed = request.schema.safeParse(record.output);
    if (!parsed.success) {
      throw new LlmError(`The recorded ${request.purpose} response no longer fits its schema.`);
    }
    return parsed.data;
  }
}
