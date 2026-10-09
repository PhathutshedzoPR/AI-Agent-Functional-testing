import type { z } from 'zod';
import { LlmError } from '@/core/errors';
import type { ILanguageModel, LlmPurpose, LlmRequest } from '@/core/ports';
import { ReplayStore } from './ReplayStore';

// Shown in the dashboard when a run stops, so each says what to do next.
const MISSING: Readonly<Record<LlmPurpose, string>> = {
  plan: 'Replay mode has no recorded plan for this story on this page. Run the story where it was recorded, then use "Run this plan on" to bring that plan here.',
  heal: 'Replay mode has no recorded repair for this broken locator.',
  report: 'Replay mode has no recorded wording for these bugs.',
};

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
        `${MISSING[request.purpose]} To plan anything new, use a live provider, or record it with npm run replays:record.`,
      );
    }
    const parsed = request.schema.safeParse(record.output);
    if (!parsed.success) {
      throw new LlmError(`The recorded ${request.purpose} response no longer fits its schema.`);
    }
    return parsed.data;
  }

  /**
   * A heal prompt carries the live page and the step's wording, both of which differ between runs
   * and plans (form state, a phone screen, another plan's intent for the same click). What a
   * repair depends on is the broken locator and the page it broke on, so for heals only, fall
   * back to a recording for that same locator on that same page. The healer still checks the
   * suggestion in the real browser before using it.
   */
  private similarHeal<S extends z.ZodType>(request: LlmRequest<S>) {
    if (request.purpose !== 'heal') return Promise.resolve(null);
    const lines = request.prompt
      .split(/\r?\n/)
      .filter((line) => /^(Broken locator: |<page_snapshot path=)/.test(line))
      .map((line) =>
        line.startsWith('<page_snapshot') ? line.replace(/ title="[^"]*">$/, '') : line,
      );
    return lines.length === 2 ? this.store.findByPromptLines('heal', lines) : Promise.resolve(null);
  }
}
