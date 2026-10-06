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
    const record =
      (await this.store.read(ReplayStore.key(request))) ?? (await this.similarHeal(request));
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

  /**
   * A heal prompt carries the live page, which can shift slightly between runs (timing, form
   * state). For heals only, fall back to a recording for the same step, broken locator and page.
   * The healer still checks the suggestion in the real browser before using it.
   */
  private similarHeal<S extends z.ZodType>(request: LlmRequest<S>) {
    if (request.purpose !== 'heal') return Promise.resolve(null);
    const lines = request.prompt
      .split(/\r?\n/)
      .filter((line) => /^(Step: |Broken locator: |<page_snapshot path=)/.test(line))
      .map((line) =>
        line.startsWith('<page_snapshot') ? line.replace(/ title="[^"]*">$/, '') : line,
      );
    return lines.length === 3 ? this.store.findByPromptLines('heal', lines) : Promise.resolve(null);
  }
}
