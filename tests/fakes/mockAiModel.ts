import { MockLanguageModelV4 } from 'ai/test';

const USAGE = {
  inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 20, text: 20, reasoning: undefined },
};

/** An AI SDK model that answers every call with `text`, or throws `error` when given. */
export function mockAiModel(
  answer: Readonly<{ text?: string; error?: Error }>,
): MockLanguageModelV4 {
  return new MockLanguageModelV4({
    doGenerate: () => {
      if (answer.error) return Promise.reject(answer.error);
      return Promise.resolve({
        content: [{ type: 'text', text: answer.text ?? '' }],
        finishReason: { unified: 'stop', raw: undefined },
        usage: USAGE,
        warnings: [],
      });
    },
  });
}
