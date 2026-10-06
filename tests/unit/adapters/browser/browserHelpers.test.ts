import { errors, type Page } from 'playwright';
import { describe, expect, it } from 'vitest';
import { PageFindingRecorder } from '@/adapters/browser/PageFindingRecorder';
import { pollUntil } from '@/adapters/browser/pollUntil';
import { toBrowserError } from '@/adapters/browser/toBrowserError';
import { BrowserError } from '@/core/errors';

describe('pollUntil', () => {
  it('returns as soon as the condition holds', async () => {
    let reads = 0;
    const outcome = await pollUntil(
      () => Promise.resolve(++reads),
      (value) => value === 3,
      { timeoutMs: 1_000, intervalMs: 1 },
    );

    expect(outcome).toEqual({ value: 3, done: true });
  });

  it('gives up after the timeout with the last value', async () => {
    const outcome = await pollUntil(
      () => Promise.resolve('Total R 35,00'),
      (text) => text.includes('70'),
      { timeoutMs: 30, intervalMs: 10 },
    );

    expect(outcome).toEqual({ value: 'Total R 35,00', done: false });
  });

  it('reads once even with no time left', async () => {
    const outcome = await pollUntil(
      () => Promise.resolve(1),
      () => false,
      { timeoutMs: 0 },
    );

    expect(outcome.done).toBe(false);
  });
});

describe('toBrowserError', () => {
  it('keeps BrowserErrors as they are', () => {
    const original = new BrowserError('not-found', 'No button');

    expect(toBrowserError(original, 'Clicking')).toBe(original);
  });

  it('maps timeouts, policy blocks and anything else', () => {
    expect(toBrowserError(new errors.TimeoutError('30s'), 'Clicking').failure).toBe('timeout');
    expect(
      toBrowserError(new Error('page.goto: net::ERR_BLOCKED_BY_CLIENT at x'), 'Opening x'),
    ).toMatchObject({ failure: 'blocked', message: 'Opening x was blocked by the target policy' });
    expect(toBrowserError('weird', 'Typing')).toMatchObject({
      failure: 'other',
      message: 'Typing failed: unknown error',
    });
  });

  it('keeps only a short first line of Playwright messages', () => {
    const error = toBrowserError(new Error(`${'x'.repeat(300)}\nCall log: ...`), 'Clicking');

    expect(error.message).toBe(`Clicking failed: ${'x'.repeat(200)}...`);
  });
});

type Handler = (payload: unknown) => void;

class FakePage {
  readonly handlers = new Map<string, Handler>();
  on(event: string, handler: Handler): void {
    this.handlers.set(event, handler);
  }
  url(): string {
    return 'http://localhost:3000/demo-shop/buggy';
  }
  emit(event: string, payload: unknown): void {
    this.handlers.get(event)?.(payload);
  }
}

const consoleMessage = (type: string, text: string) => ({ type: () => type, text: () => text });
const response = (status: number, url: string) => ({
  status: () => status,
  url: () => url,
  request: () => ({ method: () => 'GET' }),
});

describe('PageFindingRecorder', () => {
  it('records console errors, page errors, failed responses and blocked requests', () => {
    const page = new FakePage();
    const recorder = new PageFindingRecorder(page as unknown as Page);

    page.emit('console', consoleMessage('error', 'Uncaught TypeError: x is undefined'));
    page.emit('console', consoleMessage('log', 'hello'));
    page.emit('console', consoleMessage('error', 'Failed to load resource: 404'));
    page.emit('pageerror', new Error('boom'));
    page.emit('response', response(200, 'http://localhost:3000/ok'));
    page.emit('response', response(404, 'http://localhost:3000/demo-shop/buggy/specials'));
    recorder.blocked('http://169.254.169.254/');

    expect(recorder.drain().map((finding) => [finding.kind, finding.status])).toEqual([
      ['console-error', null],
      ['page-error', null],
      ['http-error', 404],
      ['blocked-request', null],
    ]);
    expect(recorder.drain()).toEqual([]);
  });

  it('caps long messages', () => {
    const page = new FakePage();
    const recorder = new PageFindingRecorder(page as unknown as Page);

    page.emit('pageerror', new Error('y'.repeat(2_000)));

    expect(recorder.drain()[0]?.message).toHaveLength(500);
  });
});
