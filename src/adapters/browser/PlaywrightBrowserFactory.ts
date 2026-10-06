import { chromium } from 'playwright';
import type { BrowserLaunchOptions, IBrowser, IBrowserFactory, ITargetPolicy } from '@/core/ports';
import { LocatorResolver } from './LocatorResolver';
import { PlaywrightBrowser } from './PlaywrightBrowser';

/** Launches real Chromium (Factory). Every browser it makes enforces the target policy. */
export class PlaywrightBrowserFactory implements IBrowserFactory {
  constructor(
    private readonly policy: ITargetPolicy,
    private readonly resolver: LocatorResolver = new LocatorResolver(),
  ) {}

  async launch(options: BrowserLaunchOptions): Promise<IBrowser> {
    const browser = await chromium.launch({
      headless: options.headless,
      slowMo: options.slowMoMs,
      // PlaywrightRequestGuard fulfils every page itself, so Chrome sees no IP for the document
      // and its Local Network Access check then blocks the page's WebSockets before our guard
      // can check them. Every HTTP request and WebSocket is still checked against the policy.
      args: ['--disable-features=LocalNetworkAccessChecks'],
    });
    return new PlaywrightBrowser(browser, this.policy, this.resolver, options);
  }
}
