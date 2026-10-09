import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { NotFoundError } from '@/core/errors';
import { createLogger } from '@/server/logger';
import { clientKey, defineApiHandler } from '@/server/http';
import { RateLimiter } from '@/server/security';

const APP = 'http://localhost:3000';

function setup(perMinute = 5) {
  const lines: string[] = [];
  const logger = createLogger((_level, line) => lines.push(line));
  const limiter = new RateLimiter(perMinute, () => 0);
  const withApiHandler = defineApiHandler({
    container: () => ({ name: 'container' }),
    logger,
    appBaseUrl: () => APP,
    rateLimiter: () => limiter,
  });
  return { withApiHandler, lines };
}

const params = (value: unknown) => ({ params: Promise.resolve(value) });
const post = (body: string, origin: string | null = APP, ip = '1.2.3.4'): Request =>
  new Request(`${APP}/api/things`, {
    method: 'POST',
    body,
    headers: { ...(origin ? { origin } : {}), 'x-forwarded-for': `${ip}, 10.0.0.1` },
  });

async function errorOf(response: Response): Promise<{ code: string; message: string }> {
  return ((await response.json()) as { error: { code: string; message: string } }).error;
}

describe('withApiHandler', () => {
  it('validates params and body and hands them to the handler with the container', async () => {
    const { withApiHandler, lines } = setup();
    const route = withApiHandler(
      {
        params: z.object({ id: z.uuid() }),
        body: z.object({ name: z.string() }),
        sameOrigin: true,
      },
      ({ params: p, body, container }) => Promise.resolve(Response.json({ p, body, container })),
    );

    const response = await route(
      post('{"name":"Thandi"}'),
      params({ id: '00000000-0000-4000-8000-000000000001' }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      p: { id: '00000000-0000-4000-8000-000000000001' },
      body: { name: 'Thandi' },
      container: { name: 'container' },
    });
    expect(JSON.parse(lines[0] ?? '{}')).toMatchObject({
      message: 'api',
      method: 'POST',
      path: '/api/things',
      status: 200,
    });
  });

  it('rejects bad params, bad bodies, non-JSON and oversized bodies with 400', async () => {
    const { withApiHandler } = setup();
    const route = withApiHandler(
      { params: z.object({ id: z.uuid() }), body: z.object({ name: z.string() }) },
      () => Promise.resolve(new Response('unreachable')),
    );

    const badParams = await route(post('{"name":"x"}'), params({ id: '../../etc' }));
    const badBody = await route(
      post('{"name":1}'),
      params({ id: '00000000-0000-4000-8000-000000000001' }),
    );
    const notJson = await route(
      post('name=x'),
      params({ id: '00000000-0000-4000-8000-000000000001' }),
    );
    const huge = await route(
      post('x'.repeat(20_000)),
      params({ id: '00000000-0000-4000-8000-000000000001' }),
    );

    expect([badParams, badBody, notJson, huge].map((r) => r.status)).toEqual([400, 400, 400, 400]);
    expect(await errorOf(badParams)).toMatchObject({ code: 'VALIDATION_FAILED' });
    expect((await errorOf(badBody)).message).toContain('name:');
    expect((await errorOf(notJson)).message).toBe('The request body must be JSON.');
    expect((await errorOf(huge)).message).toBe('The request body is too large.');
  });

  it('refuses state-changing requests from another origin or none (CSRF-lite)', async () => {
    const { withApiHandler } = setup();
    const route = withApiHandler({ sameOrigin: true }, () => Promise.resolve(new Response('ok')));

    const foreign = await route(post('{}', 'https://evil.example'), params({}));
    const missing = await route(post('{}', null), params({}));

    expect(foreign.status).toBe(403);
    expect(missing.status).toBe(403);
    expect(await errorOf(foreign)).toEqual({
      code: 'FORBIDDEN',
      message: `This server only takes runs started from ${APP}. Open TestPilot there and try again.`,
    });
  });

  it('rate-limits per client and says when to retry', async () => {
    const { withApiHandler } = setup(1);
    const route = withApiHandler({ rateLimit: 'startRun' }, () =>
      Promise.resolve(new Response('ok')),
    );

    expect((await route(post('{}'), params({}))).status).toBe(200);
    const limited = await route(post('{}'), params({}));
    const otherClient = await route(post('{}', APP, '5.6.7.8'), params({}));

    expect(limited.status).toBe(429);
    expect(limited.headers.get('Retry-After')).toBe('60');
    expect(otherClient.status).toBe(200);
  });

  it('maps app errors to their status and hides unexpected ones', async () => {
    const { withApiHandler, lines } = setup();
    const missing = withApiHandler({}, () => Promise.reject(new NotFoundError('Run')));
    const broken = withApiHandler({}, () => Promise.reject(new TypeError('secret detail')));

    const notFound = await missing(new Request(`${APP}/api/runs/x`), params({}));
    const internal = await broken(new Request(`${APP}/api/runs`), params({}));

    expect(notFound.status).toBe(404);
    expect(await errorOf(notFound)).toEqual({ code: 'NOT_FOUND', message: 'Run was not found.' });
    expect(internal.status).toBe(500);
    const body = await errorOf(internal);
    expect(body.code).toBe('INTERNAL');
    expect(body.message).not.toContain('secret');
    expect(lines.some((line) => line.includes('secret detail'))).toBe(true);
  });
});

describe('clientKey', () => {
  it('uses the first forwarded address, then x-real-ip, then local', () => {
    const headers = (h: Record<string, string>) => new Request(APP, { headers: h });

    expect(clientKey(headers({ 'x-forwarded-for': ' 1.2.3.4 , 10.0.0.1' }))).toBe('1.2.3.4');
    expect(clientKey(headers({ 'x-real-ip': '5.6.7.8' }))).toBe('5.6.7.8');
    expect(clientKey(headers({}))).toBe('local');
  });
});

describe('RateLimiter', () => {
  it('refills over time and forgets idle clients past its tracking limit', () => {
    let now = 0;
    const limiter = new RateLimiter(2, () => now);
    limiter.consume('a');
    limiter.consume('a');
    expect(() => limiter.consume('a')).toThrow(/Try again in 30 seconds/);

    now = 30_000;
    expect(() => limiter.consume('a')).not.toThrow();

    now = 10 * 60_000;
    const spy = vi.spyOn(Map.prototype, 'delete');
    for (let i = 0; i < 10_002; i += 1) limiter.consume(`client-${i}`);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
