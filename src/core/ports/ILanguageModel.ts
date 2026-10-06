import type { z } from 'zod';

export type LlmPurpose = 'plan' | 'heal' | 'report';

export type LlmRequest<S extends z.ZodType> = Readonly<{
  purpose: LlmPurpose;
  system: string;
  prompt: string;
  schema: S;
  temperature: number;
}>;

/**
 * Structured output from a language model. Implementations validate the response against
 * `schema` and throw LlmError on failure. The model only proposes; it never decides a verdict.
 */
export interface ILanguageModel {
  /** True when responses come from recorded fixtures instead of a live provider. */
  readonly replayed: boolean;
  generateObject<S extends z.ZodType>(request: LlmRequest<S>): Promise<z.infer<S>>;
}
