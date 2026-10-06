import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { APICallError } from 'ai';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  AiSdkLanguageModel,
  RecordingLanguageModel,
  ReplayLanguageModel,
  ReplayStore,
  createLanguageModel,
  toLlmError,
} from '@/adapters/llm';
import { LlmError } from '@/core/errors';
import type { LlmRequest } from '@/core/ports';
import { mockAiModel } from '../../../fakes/mockAiModel';

const Schema = z.object({ summary: z.string(), count: z.number() });
const request: LlmRequest<typeof Schema> = {
  purpose: 'plan',
  system: 'You plan tests.',
  prompt: 'Plan a test for Kota Express.',
  schema: Schema,
  temperature: 0.2,
};
const apiError = (statusCode: number): APICallError =>
  new APICallError({
    message: `HTTP ${statusCode}`,
    url: 'https://provider.example/v1',
    requestBodyValues: {},
    statusCode,
  });

describe('AiSdkLanguageModel', () => {
  it('returns schema-checked output and sends the system prompt and temperature', async () => {
    const model = mockAiModel({ text: '{"summary":"Order flow","count":2}' });
    const llm = new AiSdkLanguageModel(model);

    await expect(llm.generateObject(request)).resolves.toEqual({ summary: 'Order flow', count: 2 });
    expect(llm.replayed).toBe(false);
    const call = model.doGenerateCalls[0];
    expect(call?.temperature).toBeCloseTo(0.2);
    expect(JSON.stringify(call?.prompt)).toContain('You plan tests.');
  });

  it('turns schema mismatches into LlmError', async () => {
    const llm = new AiSdkLanguageModel(mockAiModel({ text: '{"summary":42}' }));

    await expect(llm.generateObject(request)).rejects.toMatchObject({
      code: 'LLM_FAILED',
      message: 'The language model returned something that did not match the schema.',
    });
  });

  it('does not retry a request the provider refused', async () => {
    const model = mockAiModel({ error: apiError(400) });

    await expect(new AiSdkLanguageModel(model).generateObject(request)).rejects.toMatchObject({
      message: 'The language model provider refused the request (status 400).',
      retryable: false,
    });
    expect(model.doGenerateCalls).toHaveLength(1);
  });

  it('retries a rate-limited request once with backoff, then gives up', async () => {
    const model = mockAiModel({ error: apiError(429) });

    await expect(new AiSdkLanguageModel(model).generateObject(request)).rejects.toMatchObject({
      message: 'The language model provider kept failing, even after a retry.',
      retryable: true,
    });
    expect(model.doGenerateCalls).toHaveLength(2);
  }, 15_000);
});

describe('toLlmError', () => {
  it('keeps LlmErrors and wraps anything else', () => {
    const original = new LlmError('budget spent');

    expect(toLlmError(original)).toBe(original);
    expect(toLlmError(new TypeError('x'))).toMatchObject({
      message: 'The language model call failed.',
    });
    expect(
      toLlmError(
        new APICallError({ message: 'down', url: 'https://x.example', requestBodyValues: {} }),
      ).message,
    ).toContain('no status');
  });
});

describe('recording and replay', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'testpilot-replays-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('records a live response and replays it without the provider', async () => {
    const store = new ReplayStore(dir);
    const recorder = new RecordingLanguageModel(
      new AiSdkLanguageModel(mockAiModel({ text: '{"summary":"Recorded","count":1}' })),
      store,
    );

    await recorder.generateObject(request);
    const replayed = await new ReplayLanguageModel(store).generateObject(request);

    expect(replayed).toEqual({ summary: 'Recorded', count: 1 });
    expect(recorder.replayed).toBe(false);
    expect(await readdir(dir)).toEqual([`${ReplayStore.key(request)}.json`]);
  });

  it('keys recordings by purpose, system prompt and prompt', () => {
    const key = ReplayStore.key(request);

    expect(key).toMatch(/^[\da-f]{64}$/);
    expect(ReplayStore.key({ ...request, prompt: 'Another prompt' })).not.toBe(key);
    expect(ReplayStore.key({ ...request, purpose: 'heal' })).not.toBe(key);
    expect(ReplayStore.key({ ...request })).toBe(key);
  });

  it('says how to fix a missing recording', async () => {
    await expect(
      new ReplayLanguageModel(new ReplayStore(dir)).generateObject(request),
    ).rejects.toThrow(/npm run replays:record/);
  });

  it('refuses a recording that no longer fits the schema', async () => {
    const store = new ReplayStore(dir);
    await store.write(ReplayStore.key(request), { ...request, output: { summary: 1 } });

    await expect(new ReplayLanguageModel(store).generateObject(request)).rejects.toThrow(
      /no longer fits/,
    );
  });

  it('rejects corrupt files and keys that are not digests', async () => {
    const store = new ReplayStore(dir);
    await writeFile(join(dir, `${ReplayStore.key(request)}.json`), '{"purpose":1}');

    await expect(store.read(ReplayStore.key(request))).rejects.toThrow();
    await expect(store.read('../../.env.local')).rejects.toThrow(/SHA-256/);
  });
});

describe('createLanguageModel', () => {
  const base = { model: 'some-model', record: false, replayDir: 'fixtures/llm-replays', keys: {} };

  it('builds the replay model without any key', () => {
    expect(createLanguageModel({ ...base, provider: 'replay' })).toBeInstanceOf(
      ReplayLanguageModel,
    );
  });

  it('builds each live provider, wrapped for recording when asked', () => {
    expect(
      createLanguageModel({ ...base, provider: 'anthropic', keys: { anthropic: 'k' } }),
    ).toBeInstanceOf(AiSdkLanguageModel);
    expect(
      createLanguageModel({ ...base, provider: 'openai', keys: { openai: 'k' } }),
    ).toBeInstanceOf(AiSdkLanguageModel);
    expect(
      createLanguageModel({ ...base, provider: 'google', record: true, keys: { google: 'k' } }),
    ).toBeInstanceOf(RecordingLanguageModel);
  });
});

describe('ReplayLanguageModel heal fallback', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'testpilot-heal-replays-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  const HealSchema = z.object({ to: z.string() });
  const heal = (page: string): LlmRequest<typeof HealSchema> => ({
    purpose: 'heal',
    system: 's',
    prompt: [
      'Step: click - Place the order',
      'Broken locator: {"value":"Place order"} (button "Place order")',
      'Problem: gone',
      '<page_snapshot path="/demo-shop/redesign/checkout" title="Checkout">',
      page,
      '</page_snapshot>',
    ].join('\n'),
    schema: HealSchema,
    temperature: 0,
  });

  it('replays a heal for the same step, locator and page when page details shifted', async () => {
    const store = new ReplayStore(dir);
    const recorded = heal('- textbox "Full name": Thandi');
    await store.write(ReplayStore.key(recorded), { ...recorded, output: { to: 'Confirm order' } });

    await expect(
      new ReplayLanguageModel(store).generateObject(heal('- textbox "Full name": Sipho')),
    ).resolves.toEqual({ to: 'Confirm order' });
  });

  it('never stretches plans that way, and finds nothing in an empty folder', async () => {
    const empty = new ReplayStore(join(dir, 'missing'));

    await expect(empty.findByPromptLines('heal', ['x'])).resolves.toBeNull();
    await expect(
      new ReplayLanguageModel(empty).generateObject({ ...heal('x'), purpose: 'plan' }),
    ).rejects.toThrow(/No recorded plan/);
    await expect(new ReplayLanguageModel(empty).generateObject(heal('x'))).rejects.toThrow(
      /No recorded heal/,
    );
  });
});
