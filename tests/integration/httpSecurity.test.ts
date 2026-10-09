import { describe, expect, inject, it } from 'vitest';
import { ErrorResponseSchema, runApiPaths } from '@/contracts';
import { STORY_SUGGESTIONS } from '@/components/runs/storySuggestions';
import { finishedRunOverHttp } from './httpRuns';

/**
 * CLAUDE.md section 4 checked against the real built server over HTTP, the way an attacker or a
 * curious visitor would meet it, rather than through the functions behind it.
 */
const baseUrl = inject('baseUrl');
const RUN_ID = '00000000-0000-4000-8000-00000000dead';

function startRun(body: unknown, origin: string | null = baseUrl): Promise<Response> {
  return fetch(new URL(runApiPaths.runs, baseUrl), {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(origin ? { origin } : {}) },
    body: JSON.stringify(body),
  });
}

async function errorOf(response: Response): Promise<{ status: number; code: string }> {
  const { error } = ErrorResponseSchema.parse(await response.json());
  return { status: response.status, code: error.code };
}

describe('security over HTTP (real server)', () => {
  it('sends the hardening headers on pages (s4, 12)', async () => {
    const { headers } = await fetch(baseUrl);
    const csp = headers.get('content-security-policy') ?? '';

    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toContain("'unsafe-eval'");
    expect(headers.get('x-content-type-options')).toBe('nosniff');
    expect(headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
    expect(headers.get('permissions-policy')).not.toBeNull();
  });

  it('refuses to start runs for another origin or no origin (s4, 6)', async () => {
    const target = { targetUrl: `${baseUrl}/demo-shop/stable` };

    expect(await errorOf(await startRun(target, 'https://evil.example'))).toEqual({
      status: 403,
      code: 'FORBIDDEN',
    });
    expect((await startRun(target, null)).status).toBe(403);
  });

  it.each([
    ['a host outside the allowlist', 'https://example.com/'],
    ["TestPilot's own API", `${baseUrl}/api/runs`],
    [
      'a URL with credentials in it',
      baseUrl.replace('://', '://user:secret@') + '/demo-shop/stable',
    ],
    ['a non-web scheme', 'file:///etc/passwd'],
  ])('blocks %s as a target (s4, 2 and 3)', async (_name, targetUrl) => {
    const { status, code } = await errorOf(await startRun({ targetUrl }));

    expect(status).toBe(400);
    expect(['TARGET_BLOCKED', 'VALIDATION_FAILED']).toContain(code);
  });

  it('validates every id and caps the story (s4, 5 and 7)', async () => {
    const tooLong = { targetUrl: `${baseUrl}/demo-shop/stable`, story: 'x'.repeat(2_001) };

    expect((await errorOf(await startRun(tooLong))).code).toBe('VALIDATION_FAILED');
    expect((await fetch(new URL('/api/runs/not-a-uuid', baseUrl))).status).toBe(400);
    const traversal = new URL(`/api/runs/${RUN_ID}/steps/..%2F..%2F.env/screenshot`, baseUrl);
    expect((await fetch(traversal)).status).toBe(400);
    expect(await errorOf(await fetch(new URL(runApiPaths.run(RUN_ID), baseUrl)))).toEqual({
      status: 404,
      code: 'NOT_FOUND',
    });
  });

  it('serves screenshots as JPEG that browsers may not sniff (s4, 7)', async () => {
    const { run, events } = await finishedRunOverHttp(baseUrl, {
      targetUrl: `${baseUrl}/demo-shop/stable`,
      story: STORY_SUGGESTIONS[0]?.story ?? null,
    });
    const step = events.find((event) => event.type === 'step.finished');
    expect(step?.type).toBe('step.finished');
    const stepId = step?.type === 'step.finished' ? step.result.stepId : '';

    const response = await fetch(new URL(runApiPaths.screenshot(run.id, stepId), baseUrl));
    const bytes = new Uint8Array(await response.arrayBuffer());

    expect(response.headers.get('content-type')).toBe('image/jpeg');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect([bytes[0], bytes[1]]).toEqual([0xff, 0xd8]);
  });
});
