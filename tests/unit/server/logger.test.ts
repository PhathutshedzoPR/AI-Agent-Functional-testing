import { describe, expect, it } from 'vitest';
import { createLogger, redact } from '@/server/logger';
import { createContainer } from '@/server/createContainer';
import { parseEnv } from '@/server/env';

describe('logger', () => {
  it('writes one JSON line per message and hides secrets', () => {
    const written: Array<[string, string]> = [];
    const logger = createLogger((level, line) => written.push([level, line]));

    logger.warn('provider slow', {
      apiKey: 'sk-123',
      nested: { authorization: 'Bearer x', ok: 1 },
    });
    logger.error('boom', { error: new Error('kaput') });
    logger.info('hello');

    const [first, second] = written.map(([, line]) => JSON.parse(line) as Record<string, unknown>);
    expect(written.map(([level]) => level)).toEqual(['warn', 'error', 'info']);
    expect(first).toMatchObject({
      level: 'warn',
      message: 'provider slow',
      apiKey: '[redacted]',
      nested: { authorization: '[redacted]', ok: 1 },
    });
    expect(second?.error).toMatchObject({ name: 'Error', message: 'kaput' });
    expect(written.join('')).not.toContain('sk-123');
  });

  it('copies arrays and stops at a safe depth', () => {
    expect(redact([{ token: 't' }])).toEqual([{ token: '[redacted]' }]);
    const deep = { a: { b: { c: { d: { e: { f: { g: 1 } } } } } } };
    expect(JSON.stringify(redact(deep))).toContain('"g":1');
  });
});

describe('createContainer', () => {
  it('wires a run service and a rate limiter from env alone', () => {
    const env = parseEnv({
      APP_BASE_URL: 'http://localhost:3000',
      TARGET_ALLOWLIST: 'localhost:3000',
    });

    const container = createContainer(
      env,
      createLogger(() => undefined),
    );

    expect(container.env).toBe(env);
    expect(typeof container.runs.start).toBe('function');
    expect(() => container.rateLimits.startRun.consume('local')).not.toThrow();
  });
});
