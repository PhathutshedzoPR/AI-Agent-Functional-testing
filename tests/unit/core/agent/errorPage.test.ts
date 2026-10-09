import { describe, expect, it } from 'vitest';
import { errorPageFailure, landedOnErrorPage } from '@/core/agent/errorPage';
import { FakeBrowserSession } from '../../../fakes/FakeBrowserSession';

const PAGE = 'http://localhost:3000/demo-shop/buggy/specials';

describe('errorPageFailure', () => {
  it('fails a step that ends on a page whose address answers 404', () => {
    expect(errorPageFailure(PAGE, 404)?.message).toBe(
      'Expected /demo-shop/buggy/specials to load, but the server answered 404 for it.',
    );
  });

  it('counts 410 and server errors, and lets ordinary and on-purpose answers through', () => {
    expect(errorPageFailure(PAGE, 410)).not.toBeNull();
    expect(errorPageFailure(PAGE, 503)).not.toBeNull();
    for (const status of [200, 401, 403, 422, null]) {
      expect(errorPageFailure(PAGE, status)).toBeNull();
    }
  });
});

describe('landedOnErrorPage', () => {
  it('asks the site about each new address once per scenario', async () => {
    const session = new FakeBrowserSession(PAGE);
    session.statuses.set(PAGE, 404);
    const checked = new Set<string>();

    expect(await landedOnErrorPage(session, checked)).not.toBeNull();
    expect(await landedOnErrorPage(session, checked)).toBeNull();
  });

  it('skips pages that are not on the web, such as about:blank', async () => {
    expect(await landedOnErrorPage(new FakeBrowserSession('about:blank'), new Set())).toBeNull();
  });
});
