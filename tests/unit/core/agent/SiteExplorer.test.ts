import { describe, expect, it } from 'vitest';
import { SiteExplorer } from '@/core/agent/SiteExplorer';
import { BrowserError } from '@/core/errors';
import type { PageSnapshot } from '@/core/ports';
import { FakeBrowserSession } from '../../../fakes/FakeBrowserSession';

const ORIGIN = 'http://localhost:3000';
const at = (path: string): string => `${ORIGIN}${path}`;
const START = new URL(at('/demo-shop/buggy'));

function shop(): FakeBrowserSession {
  const session = new FakeBrowserSession();
  session.linksByUrl.set(START.href, [
    at('/demo-shop/buggy'),
    at('/demo-shop/buggy/specials'),
    at('/demo-shop/buggy/cart#top'),
    at('/demo-shop/stable'),
    'https://elsewhere.example/demo-shop/buggy/cart',
    'mailto:orders@example.co.za',
    'not a url',
  ]);
  session.linksByUrl.set(at('/demo-shop/buggy/cart'), [at('/demo-shop/buggy/checkout')]);
  session.statuses.set(at('/demo-shop/buggy/specials'), 404);
  session.ariaByUrl.set(at('/demo-shop/buggy/cart'), '- heading "Your order"');
  return session;
}

async function explore(session: FakeBrowserSession, maxPages = 5) {
  const seen: PageSnapshot[] = [];
  const result = await new SiteExplorer({ maxPages, snapshotMaxChars: 1_000 }).explore(
    session,
    START,
    (page) => {
      seen.push(page);
      return Promise.resolve();
    },
  );
  return { ...result, seen };
}

describe('SiteExplorer', () => {
  it('crawls breadth first, staying on the origin and under the start path', async () => {
    const session = shop();
    const { pages, seen } = await explore(session);

    expect(pages.map((page) => page.url)).toEqual([
      at('/demo-shop/buggy'),
      at('/demo-shop/buggy/cart'),
      at('/demo-shop/buggy/checkout'),
    ]);
    expect(seen).toEqual(pages);
    expect(pages[1]?.aria).toBe('- heading "Your order"');
    expect(session.calls.some((call) => call.includes('/demo-shop/stable'))).toBe(false);
    expect(session.calls.some((call) => call.includes('elsewhere'))).toBe(false);
  });

  it('records pages that fail to load as broken links, once', async () => {
    const session = shop();
    const specials = at('/demo-shop/buggy/specials');
    const goto = session.goto.bind(session);
    session.goto = async (url) => {
      const status = await goto(url);
      if (url === specials) {
        session.report({ kind: 'http-error', message: 'GET 404', url: specials, status: 404 });
      }
      return status;
    };

    const { findings } = await explore(session);

    expect(findings).toEqual([
      {
        kind: 'broken-link',
        message: `${at('/demo-shop/buggy/specials')} returned 404`,
        url: at('/demo-shop/buggy/specials'),
        status: 404,
      },
    ]);
  });

  it('stops at the page budget', async () => {
    const { pages } = await explore(shop(), 2);

    expect(pages).toHaveLength(2);
  });

  it('keeps findings the browser reported while crawling', async () => {
    const session = shop().report({
      kind: 'console-error',
      message: 'boom',
      url: START.href,
      status: null,
    });

    const { findings } = await explore(session);

    expect(findings.map((finding) => finding.kind)).toContain('console-error');
  });

  it('turns pages that cannot be opened into findings, but lets other errors through', async () => {
    const blocked = shop();
    blocked.goto = () => Promise.reject(new BrowserError('blocked', 'nope'));
    const broken = shop();
    broken.goto = () => Promise.reject(new TypeError('bug'));

    const { pages, findings } = await explore(blocked);

    expect(pages).toEqual([]);
    expect(findings[0]?.message).toContain('could not be opened');
    await expect(explore(broken)).rejects.toBeInstanceOf(TypeError);
  });

  it('measures every page it reads, but not pages that failed to load', async () => {
    const session = shop();
    session.measurement = { ...session.measurement, ttfbMs: 3_400 };

    const { pages, audits } = await explore(session);

    expect(audits.map((audit) => audit.url)).toEqual(pages.map((page) => page.url));
    expect(audits.every((audit) => audit.checks[0]?.status === 'failed')).toBe(true);
    expect(session.calls).not.toContain(`measure ${at('/demo-shop/buggy/specials')}`);
  });
});
