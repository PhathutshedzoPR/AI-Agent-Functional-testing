import type { z } from 'zod';
import { LlmError } from '@/core/errors';
import type { ILanguageModel, LlmPurpose, LlmRequest } from '@/core/ports';

/**
 * Answers each purpose with a canned value (or a function of the request), validated against the
 * request's schema like a real adapter would. Records every request for assertions.
 */
export class FakeLanguageModel implements ILanguageModel {
  readonly replayed = false;
  readonly requests: LlmRequest<z.ZodType>[] = [];
  private readonly answers = new Map<LlmPurpose, unknown>();
  private delayMs = 0;

  /** Makes every call take `ms` of real time, like a slow provider. */
  slow(ms: number): this {
    this.delayMs = ms;
    return this;
  }

  /** `value` may be a function of the request, to answer differently per call. */
  answer(purpose: LlmPurpose, value: unknown): this {
    this.answers.set(purpose, value);
    return this;
  }

  async generateObject<S extends z.ZodType>(request: LlmRequest<S>): Promise<z.infer<S>> {
    this.requests.push(request);
    if (this.delayMs > 0) await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    if (!this.answers.has(request.purpose)) {
      return Promise.reject(new LlmError(`No fake answer for ${request.purpose}`));
    }
    const answer = this.answers.get(request.purpose);
    const value =
      typeof answer === 'function' ? (answer as (r: LlmRequest<S>) => unknown)(request) : answer;
    const parsed = request.schema.safeParse(value);
    return parsed.success
      ? Promise.resolve(parsed.data)
      : Promise.reject(new LlmError('Fake answer does not match the schema'));
  }
}
