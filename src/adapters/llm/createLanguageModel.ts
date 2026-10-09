import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';
import type { ILanguageModel } from '@/core/ports';
import { AiSdkLanguageModel } from './AiSdkLanguageModel';
import { FallbackLanguageModel, type FallbackListener } from './FallbackLanguageModel';
import { RecordingLanguageModel } from './RecordingLanguageModel';
import { ReplayLanguageModel } from './ReplayLanguageModel';
import { ReplayStore } from './ReplayStore';

export type LiveProvider = 'google' | 'anthropic' | 'openai' | 'openrouter' | 'nvidia';

export type LanguageModelSettings = Readonly<{
  provider: LiveProvider | 'replay';
  model: string | undefined;
  /** Backups asked in order when the main model fails. */
  fallbacks?: readonly Readonly<{ provider: LiveProvider; model: string }>[];
  record: boolean;
  replayDir: string;
  keys: Readonly<Partial<Record<LiveProvider, string>>>;
  onFallback?: FallbackListener;
}>;

// OpenRouter and NVIDIA both speak the OpenAI chat completions API at their own address.
const OPENAI_COMPATIBLE = {
  openrouter: 'https://openrouter.ai/api/v1',
  nvidia: 'https://integrate.api.nvidia.com/v1',
} as const;

/** Builds the configured model (Factory). Settings are already validated by the env schema. */
export function createLanguageModel(settings: LanguageModelSettings): ILanguageModel {
  const store = new ReplayStore(settings.replayDir);
  if (settings.provider === 'replay') {
    return new ReplayLanguageModel(store);
  }
  const chain = [
    { provider: settings.provider, model: settings.model ?? '' },
    ...(settings.fallbacks ?? []),
  ].map(({ provider, model }) => ({
    name: `${provider} ${model}`,
    model: new AiSdkLanguageModel(providerModel(provider, model, settings.keys)),
  }));
  const live =
    chain.length > 1 ? new FallbackLanguageModel(chain, settings.onFallback) : chain[0]?.model;
  if (!live) throw new Error('No language model is configured.');
  return settings.record ? new RecordingLanguageModel(live, store) : live;
}

function providerModel(
  provider: LiveProvider,
  modelId: string,
  keys: LanguageModelSettings['keys'],
): LanguageModel {
  switch (provider) {
    case 'google':
      return createGoogleGenerativeAI({ apiKey: keys.google })(modelId);
    case 'anthropic':
      return createAnthropic({ apiKey: keys.anthropic })(modelId);
    case 'openrouter':
    case 'nvidia':
      return createOpenAI({
        name: provider,
        baseURL: OPENAI_COMPATIBLE[provider],
        apiKey: keys[provider],
      }).chat(modelId);
    default:
      return createOpenAI({ apiKey: keys.openai })(modelId);
  }
}
