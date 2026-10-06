import type { Browser } from 'playwright';
import type { BrowserLaunchOptions, IBrowser, IBrowserSession, ITargetPolicy } from '@/core/ports';
import type { LocatorResolver } from './LocatorResolver';
import { PageFindingRecorder } from './PageFindingRecorder';
import { PlaywrightBrowserSession } from './PlaywrightBrowserSession';
import { PlaywrightRequestGuard } from './PlaywrightRequestGuard';

const VIEWPORT = { width: 1280, height: 800 };
const MIN_NAVIGATION_TIMEOUT_MS = 15_000;

/** One Chromium process per run; every scenario gets a fresh context (clean cookies and storage). */
export class PlaywrightBrowser implements IBrowser {
  constructor(
    private readonly browser: Browser,
    private readonly policy: ITargetPolicy,
    private readonly resolver: LocatorResolver,
    private readonly options: BrowserLaunchOptions,
  ) {}

  async newSession(): Promise<IBrowserSession> {
    const context = await this.browser.newContext({
      viewport: VIEWPORT,
      locale: 'en-ZA',
      timezoneId: 'Africa/Johannesburg',
      serviceWorkers: 'block',
      acceptDownloads: false,
    });
    try {
      context.setDefaultTimeout(this.options.stepTimeoutMs);
      const page = await context.newPage();
      const recorder = new PageFindingRecorder(page);
      await new PlaywrightRequestGuard(this.policy, (url) => recorder.blocked(url)).install(
        context,
      );
      return new PlaywrightBrowserSession(context, page, this.resolver, recorder, {
        stepTimeoutMs: this.options.stepTimeoutMs,
        navigationTimeoutMs: Math.max(this.options.stepTimeoutMs, MIN_NAVIGATION_TIMEOUT_MS),
      });
    } catch (error) {
      await context.close();
      throw error;
    }
  }

  async close(): Promise<void> {
    await this.browser.close();
  }
}
