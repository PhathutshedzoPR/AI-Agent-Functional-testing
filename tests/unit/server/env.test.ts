import { afterEach, describe, expect, it, vi } from 'vitest';
import { getEnv, parseEnv } from '@/server/env';

const BASE = { APP_BASE_URL: 'http://localhost:3000' } as const;

describe('parseEnv', () => {
  it('applies safe defaults for a replay setup', () => {
    const env = parseEnv(BASE);

    expect(env.LLM_PROVIDER).toBe('replay');
    expect(env.LLM_RECORD).toBe(false);
    expect(env.TARGET_MODE).toBe('allowlist');
    expect(env.TARGET_ALLOWLIST).toEqual([]);
    expect(env.AGENT_MAX_LLM_CALLS).toBe(12);
    expect(env.AGENT_HEADLESS).toBe(true);
    expect(env.AGENT_HEAL_MIN_CONFIDENCE).toBeCloseTo(0.7);
  });

  it('treats blank values as unset so placeholders fall back to defaults', () => {
    const env = parseEnv({ ...BASE, AGENT_MAX_PAGES: '', GOOGLE_GENERATIVE_AI_API_KEY: '  ' });

    expect(env.AGENT_MAX_PAGES).toBe(5);
    expect(env.GOOGLE_GENERATIVE_AI_API_KEY).toBeUndefined();
  });

  it('coerces numbers and booleans and splits the allowlist', () => {
    const env = parseEnv({
      ...BASE,
      AGENT_MAX_STEPS: '20',
      AGENT_HEADLESS: 'false',
      TARGET_ALLOWLIST: ' LocalHost:3000 , kota.test ,',
    });

    expect(env.AGENT_MAX_STEPS).toBe(20);
    expect(env.AGENT_HEADLESS).toBe(false);
    expect(env.TARGET_ALLOWLIST).toEqual(['localhost:3000', 'kota.test']);
  });

  it('requires a model and the matching key for a live provider', () => {
    expect(() => parseEnv({ ...BASE, LLM_PROVIDER: 'google' })).toThrow(
      /LLM_MODEL: required[\s\S]*GOOGLE_GENERATIVE_AI_API_KEY: required/,
    );
    expect(() =>
      parseEnv({ ...BASE, LLM_PROVIDER: 'anthropic', LLM_MODEL: 'm', OPENAI_API_KEY: 'k' }),
    ).toThrow(/ANTHROPIC_API_KEY: required/);
  });

  it('accepts a live provider with its model and key', () => {
    const env = parseEnv({ ...BASE, LLM_PROVIDER: 'openai', LLM_MODEL: 'm', OPENAI_API_KEY: 'k' });

    expect(env.LLM_PROVIDER).toBe('openai');
  });

  it('rejects recording in replay mode', () => {
    expect(() => parseEnv({ ...BASE, LLM_RECORD: 'true' })).toThrow(/LLM_RECORD/);
  });

  it('rejects a missing or non-http base URL, out-of-range values and unknown modes', () => {
    expect(() => parseEnv({})).toThrow(/APP_BASE_URL/);
    expect(() => parseEnv({ APP_BASE_URL: 'ftp://example.com' })).toThrow(/APP_BASE_URL/);
    expect(() => parseEnv({ ...BASE, AGENT_HEAL_MIN_CONFIDENCE: '1.5' })).toThrow(
      /AGENT_HEAL_MIN_CONFIDENCE/,
    );
    expect(() => parseEnv({ ...BASE, AGENT_MAX_PAGES: '0' })).toThrow(/AGENT_MAX_PAGES/);
    expect(() => parseEnv({ ...BASE, TARGET_MODE: 'anything' })).toThrow(/TARGET_MODE/);
  });

  it('never echoes a secret value in its error message', () => {
    const secret = 'sk-very-secret-value';
    try {
      parseEnv({ ...BASE, LLM_PROVIDER: 'openai', OPENAI_API_KEY: secret, AGENT_MAX_PAGES: 'x' });
      expect.unreachable('parseEnv should have thrown');
    } catch (error) {
      expect(String(error)).not.toContain(secret);
    }
  });
});

describe('getEnv', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('parses process.env once and returns the same object afterwards', () => {
    vi.stubEnv('APP_BASE_URL', 'http://localhost:3000');

    const first = getEnv();
    vi.stubEnv('AGENT_MAX_PAGES', '9');

    expect(getEnv()).toBe(first);
  });
});
