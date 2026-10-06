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
    });
    return new PlaywrightBrowser(browser, this.policy, this.resolver, options);
  }
}
