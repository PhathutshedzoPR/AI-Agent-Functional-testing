import type { z } from 'zod';
import { LlmError } from '../errors';
import type { ILanguageModel, LlmRequest } from '../ports';
import type { EmitEvent } from './RunContext';

/**
 * Caps a run's LLM calls and reports each one (Decorator). The cap is checked before the call,
 * so a run can never spend more than `max`.
 */
export class BudgetedLanguageModel implements ILanguageModel {
  private used = 0;

  constructor(
    private readonly inner: ILanguageModel,
    private readonly max: number,
    private readonly emit: EmitEvent,
  ) {}

  get replayed(): boolean {
    return this.inner.replayed;
  }

  get callsUsed(): number {
    return this.used;
  }

  async generateObject<S extends z.ZodType>(request: LlmRequest<S>): Promise<z.infer<S>> {
    if (this.used >= this.max) {
      throw new LlmError(`This run has used all ${this.max} of its LLM calls.`);
    }
    this.used += 1;
    await this.emit({
      type: 'llm.called',
      purpose: request.purpose,
      used: this.used,
      max: this.max,
    });
    return this.inner.generateObject(request);
  }
}
