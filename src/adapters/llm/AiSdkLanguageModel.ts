import { generateText, Output, type LanguageModel } from 'ai';
import type { z } from 'zod';
import type { ILanguageModel, LlmRequest } from '@/core/ports';
import { toLlmError } from './toLlmError';

const CALL_TIMEOUT_MS = 60_000;
// The SDK retries 429 and 5xx responses with exponential backoff; once is enough (CLAUDE.md s7).
const MAX_RETRIES = 1;
// Plans and heals need careful reading, not long deliberation; low effort keeps a run quick.
const REASONING = 'low';

/** Structured output through the Vercel AI SDK (Adapter). Any provider the SDK supports works. */
export class AiSdkLanguageModel implements ILanguageModel {
  readonly replayed = false;

  constructor(private readonly model: LanguageModel) {}

  async generateObject<S extends z.ZodType>(request: LlmRequest<S>): Promise<z.infer<S>> {
    try {
      const result = await generateText({
        model: this.model,
        instructions: request.system,
        prompt: request.prompt,
        output: Output.object({ schema: request.schema }),
        temperature: request.temperature,
        reasoning: REASONING,
        maxRetries: MAX_RETRIES,
        timeout: CALL_TIMEOUT_MS,
      });
      return result.output as z.infer<S>;
    } catch (error) {
      throw toLlmError(error);
    }
  }
}
