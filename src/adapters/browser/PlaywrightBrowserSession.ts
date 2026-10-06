import type { BrowserContext, Page, Locator as PlaywrightLocator } from 'playwright';
import { Locator } from '@/core/domain';
import { BrowserError } from '@/core/errors';
import type { IBrowserSession, PageSnapshot, PollResult, RawFinding } from '@/core/ports';
import type { LocatorResolver } from './LocatorResolver';
import type { PageFindingRecorder } from './PageFindingRecorder';
import { pollUntil } from './pollUntil';
import { toBrowserError } from './toBrowserError';

export type SessionTiming = Readonly<{ stepTimeoutMs: number; navigationTimeoutMs: number }>;

const TRIM_NOTE = '\n# (snapshot trimmed)';
const JPEG_QUALITY = 60;
const SETTLE_INTERVAL_MS = 250;
const SCREENSHOT_SETTLE_MS = 1_500;

/** One scenario's browser context and page (Adapter over Playwright). */
export class PlaywrightBrowserSession implements IBrowserSession {
  constructor(
    private readonly context: BrowserContext,
    private readonly page: Page,
    private readonly resolver: LocatorResolver,
    private readonly recorder: PageFindingRecorder,
    private readonly timing: SessionTiming,
  ) {}

  async goto(url: string): Promise<number | null> {
    try {
      const response = await this.page.goto(url, {
        waitUntil: 'load',
        timeout: this.timing.navigationTimeoutMs,
      });
      return response?.status() ?? null;
    } catch (error) {
      throw toBrowserError(error, `Opening ${url}`);
    }
  }

  currentUrl(): string {
    return this.page.url();
  }

  async links(): Promise<string[]> {
    try {
      // A fixed function of ours, never model-provided code (CLAUDE.md section 4, item 4).
      return await this.page
        .getByRole('link')
        .filter({ visible: true })
        .evaluateAll((anchors) => anchors.map((anchor) => (anchor as HTMLAnchorElement).href));
    } catch (error) {
      throw toBrowserError(error, 'Reading the links');
    }
  }

  async snapshot(maxChars: number): Promise<PageSnapshot> {
    try {
      const aria = await this.settledAriaSnapshot();
      return { url: this.page.url(), title: await this.page.title(), aria: trim(aria, maxChars) };
    } catch (error) {
      throw toBrowserError(error, 'Reading the page');
    }
  }

  /**
   * Pages keep changing while they hydrate and fetch data. Waiting for the network to go quiet
   * and for two reads to agree keeps snapshots (and so prompts and replay keys) stable.
   */
  private async settledAriaSnapshot(): Promise<string> {
    const timeout = this.timing.stepTimeoutMs;
    await this.page.waitForLoadState('networkidle', { timeout }).catch(() => {
      // A page that never goes quiet (polling, streaming) is still worth reading.
    });
    const read = (): Promise<string> => this.page.locator('body').ariaSnapshot({ timeout });
    let previous: string | null = null;
    const outcome = await pollUntil(
      read,
      (current) => {
        const settled = current === previous;
        previous = current;
        return settled;
      },
      { timeoutMs: timeout, intervalMs: SETTLE_INTERVAL_MS },
    );
    return outcome.value;
  }

  click(target: Locator): Promise<void> {
    return this.interact(target, 'Clicking', (element) => element.click());
  }

  check(target: Locator): Promise<void> {
    return this.interact(target, 'Checking', (element) => element.check());
  }

  fill(target: Locator, value: string): Promise<void> {
    return this.interact(target, 'Typing into', (element) => element.fill(value));
  }

  selectOption(target: Locator, label: string): Promise<void> {
    return this.interact(target, 'Choosing an option in', async (element) => {
      await element.selectOption({ label });
    });
  }

  async press(target: Locator | null, key: string): Promise<void> {
    if (target) {
      await this.interact(target, `Pressing ${key} on`, (element) => element.press(key));
      return;
    }
    try {
      await this.page.keyboard.press(key);
    } catch (error) {
      throw toBrowserError(error, `Pressing ${key}`);
    }
  }

  countVisible(target: Locator): Promise<number> {
    return this.visible(target).count();
  }

  async waitForVisible(target: Locator): Promise<boolean> {
    return (
      await this.poll(
        () => this.countVisible(target),
        (count) => count > 0,
      )
    ).done;
  }

  async waitForHidden(target: Locator): Promise<boolean> {
    return (
      await this.poll(
        () => this.countVisible(target),
        (count) => count === 0,
      )
    ).done;
  }

  async pollText(target: Locator | null, matches: (text: string) => boolean): Promise<PollResult> {
    const read = target
      ? async (): Promise<string> => (await this.visible(target).allInnerTexts()).join('\n')
      : (): Promise<string> => this.page.locator('body').innerText();
    const outcome = await this.poll(read, matches);
    return { matched: outcome.done, actual: outcome.value };
  }

  async pollValue(target: Locator, matches: (value: string) => boolean): Promise<PollResult> {
    const element = await this.findOne(target);
    const outcome = await this.poll(() => element.inputValue(), matches);
    return { matched: outcome.done, actual: outcome.value };
  }

  async pollUrl(matches: (url: string) => boolean): Promise<PollResult> {
    const outcome = await this.poll(() => Promise.resolve(this.page.url()), matches);
    return { matched: outcome.done, actual: outcome.value };
  }

  async screenshot(): Promise<Uint8Array> {
    // A click that starts a client-side navigation returns before the next page arrives; a short
    // wait for the network to go quiet makes the screenshot show what the step led to.
    await this.page
      .waitForLoadState('networkidle', { timeout: SCREENSHOT_SETTLE_MS })
      .catch(() => undefined); // a page that never goes quiet is captured as it is
    try {
      return await this.page.screenshot({ type: 'jpeg', quality: JPEG_QUALITY });
    } catch (error) {
      throw toBrowserError(error, 'Taking a screenshot');
    }
  }

  drainFindings(): RawFinding[] {
    return this.recorder.drain();
  }

  async close(): Promise<void> {
    await this.context.close();
  }

  private visible(target: Locator): PlaywrightLocator {
    return this.resolver.resolve(this.page, target).filter({ visible: true });
  }

  private poll<T>(read: () => Promise<T>, done: (value: T) => boolean) {
    return pollUntil(read, done, { timeoutMs: this.timing.stepTimeoutMs });
  }

  /** Waits for exactly one visible match. Fails fast when several elements match. */
  private async findOne(target: Locator): Promise<PlaywrightLocator> {
    const element = this.visible(target);
    const outcome = await this.poll(
      () => element.count(),
      (count) => count > 0,
    );
    if (outcome.value === 0) {
      throw new BrowserError('not-found', `No visible ${Locator.describe(target)} on the page`);
    }
    if (outcome.value > 1) {
      throw new BrowserError(
        'ambiguous',
        `${Locator.describe(target)} matched ${outcome.value} visible elements`,
      );
    }
    return element;
  }

  private async interact(
    target: Locator,
    verb: string,
    act: (element: PlaywrightLocator) => Promise<void>,
  ): Promise<void> {
    const element = await this.findOne(target);
    try {
      await act(element);
    } catch (error) {
      throw toBrowserError(error, `${verb} ${Locator.describe(target)}`);
    }
  }
}

function trim(aria: string, maxChars: number): string {
  if (aria.length <= maxChars) return aria;
  const cut = aria.lastIndexOf('\n', maxChars - TRIM_NOTE.length);
  return `${aria.slice(0, Math.max(cut, 0))}${TRIM_NOTE}`;
}
