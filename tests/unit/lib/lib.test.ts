import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { formatDuration } from '@/lib/formatDuration';
import { ApiRequestError, sendJson } from '@/lib/sendJson';

const Reply = z.object({ ok: z.boolean() });
const answering =
  (status: number, body: unknown): typeof fetch =>
  () =>
    Promise.resolve(
      new Response(typeof body === 'string' ? body : JSON.stringify(body), { status }),
    );

describe('sendJson', () => {
  it('posts JSON and returns the parsed reply', async () => {
    let sent: RequestInit | undefined;
    const fetcher: typeof fetch = (_path, init) => {
      sent = init;
      return Promise.resolve(Response.json({ ok: true }));
    };

    await expect(sendJson('/api/runs', { a: 1 }, Reply, fetcher)).resolves.toEqual({ ok: true });
    expect(sent).toMatchObject({ method: 'POST', body: '{"a":1}' });
  });

  it('surfaces the server’s safe error message', async () => {
    const error = sendJson(
      '/api/runs',
      {},
      Reply,
      answering(400, {
        error: { code: 'TARGET_BLOCKED', message: 'That address is not allowed.' },
      }),
    );

    await expect(error).rejects.toMatchObject({
      message: 'That address is not allowed.',
      code: 'TARGET_BLOCKED',
      status: 400,
    });
  });

  it('copes with unreadable errors, odd replies and a dead network', async () => {
    await expect(sendJson('/x', {}, Reply, answering(502, 'gateway'))).rejects.toMatchObject({
      message: 'The server answered 502.',
    });
    await expect(sendJson('/x', {}, Reply, answering(200, { ok: 'yes' }))).rejects.toMatchObject({
      code: 'BAD_RESPONSE',
    });
    await expect(
      sendJson('/x', {}, Reply, () => Promise.reject(new TypeError('offline'))),
    ).rejects.toBeInstanceOf(ApiRequestError);
  });
});

describe('formatDuration', () => {
  it('shows minutes and seconds, adding hours when needed', () => {
    expect(formatDuration(21_000)).toBe('0:21');
    expect(formatDuration(125_400)).toBe('2:05');
    expect(formatDuration(3_725_000)).toBe('1:02:05');
    expect(formatDuration(-5)).toBe('0:00');
  });
});
