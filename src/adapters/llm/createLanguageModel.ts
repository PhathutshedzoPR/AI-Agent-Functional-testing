import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';
import type { ILanguageModel } from '@/core/ports';
import { AiSdkLanguageModel } from './AiSdkLanguageModel';
import { RecordingLanguageModel } from './RecordingLanguageModel';
import { ReplayLanguageModel } from './ReplayLanguageModel';
import { ReplayStore } from './ReplayStore';

export type LanguageModelSettings = Readonly<{
  provider: 'google' | 'anthropic' | 'openai' | 'replay';
  model: string | undefined;
  record: boolean;
  replayDir: string;
  keys: Readonly<{ google?: string; anthropic?: string; openai?: string }>;
}>;

/** Builds the configured model (Factory). Settings are already validated by the env schema. */
export function createLanguageModel(settings: LanguageModelSettings): ILanguageModel {
  const store = new ReplayStore(settings.replayDir);
  if (settings.provider === 'replay') {
    return new ReplayLanguageModel(store);
  }
  const live = new AiSdkLanguageModel(providerModel(settings));
  return settings.record ? new RecordingLanguageModel(live, store) : live;
}

function providerModel(settings: LanguageModelSettings): LanguageModel {
  const modelId = settings.model ?? '';
  switch (settings.provider) {
    case 'google':
      return createGoogleGenerativeAI({ apiKey: settings.keys.google })(modelId);
    case 'anthropic':
      return createAnthropic({ apiKey: settings.keys.anthropic })(modelId);
    default:
      return createOpenAI({ apiKey: settings.keys.openai })(modelId);
  }
}
