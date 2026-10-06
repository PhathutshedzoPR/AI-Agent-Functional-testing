import { Locator } from '@/core/domain';
import { BrowserError, type BrowserFailure } from '@/core/errors';
import type { IBrowserSession, PageSnapshot, PollResult, RawFinding } from '@/core/ports';

/** Smallest valid-looking JPEG header; enough for code that only stores the bytes. */
export const FAKE_JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

/**
 * In-memory stand-in for a browser page. Elements are keyed by Locator.describe(), so tests set
 * up exactly what is visible, what text it holds and which interactions fail.
 */
export class FakeBrowserSession implements IBrowserSession {
  readonly calls: string[] = [];
  title = 'Kota Express';
  aria = '- heading "Menu" [level=1]';
  pageText = '';
  closed = false;
  private url: string;
  private readonly visible = new Map<string, number>();
  private readonly texts = new Map<string, string>();
  private readonly values = new Map<string, string>();
  private readonly failures = new Map<string, BrowserFailure>();
  private findings: RawFinding[] = [];

  constructor(url = 'http://localhost:3000/demo-shop/stable') {
    this.url = url;
  }

  show(locator: Locator, options: { count?: number; text?: string } = {}): this {
    const key = Locator.describe(locator);
    this.visible.set(key, options.count ?? 1);
    if (options.text !== undefined) this.texts.set(key, options.text);
    return this;
  }

  hide(locator: Locator): this {
    this.visible.set(Locator.describe(locator), 0);
    return this;
  }

  setValue(locator: Locator, value: string): this {
    this.values.set(Locator.describe(locator), value);
    return this;
  }

  failOn(locator: Locator, failure: BrowserFailure): this {
    this.failures.set(Locator.describe(locator), failure);
    return this;
  }

  report(finding: RawFinding): this {
    this.findings.push(finding);
    return this;
  }

  /** Status per URL for goto; unlisted URLs answer 200. */
  readonly statuses = new Map<string, number>();
  /** Links per URL, returned by links() while that URL is open. */
  readonly linksByUrl = new Map<string, string[]>();
  /** Snapshot text per URL; falls back to `aria`. */
  readonly ariaByUrl = new Map<string, string>();

  goto(url: string): Promise<number | null> {
    this.calls.push(`goto ${url}`);
    this.url = url;
    return Promise.resolve(this.statuses.get(url) ?? 200);
  }

  links(): Promise<string[]> {
    return Promise.resolve(this.linksByUrl.get(this.url) ?? []);
  }

  currentUrl(): string {
    return this.url;
  }

  snapshot(maxChars: number): Promise<PageSnapshot> {
    return Promise.resolve({
      url: this.url,
      title: this.title,
      aria: (this.ariaByUrl.get(this.url) ?? this.aria).slice(0, maxChars),
    });
  }

  click(target: Locator): Promise<void> {
    return this.interact('click', target);
  }

  check(target: Locator): Promise<void> {
    return this.interact('check', target);
  }

  async fill(target: Locator, value: string): Promise<void> {
    await this.interact('fill', target, value);
    this.values.set(Locator.describe(target), value);
  }

  selectOption(target: Locator, label: string): Promise<void> {
    return this.interact('select', target, label);
  }

  async press(target: Locator | null, key: string): Promise<void> {
    if (target) {
      await this.interact('press', target, key);
      return;
    }
    this.calls.push(`press ${key}`);
  }

  countVisible(target: Locator): Promise<number> {
    return Promise.resolve(this.visible.get(Locator.describe(target)) ?? 0);
  }

  async waitForVisible(target: Locator): Promise<boolean> {
    return (await this.countVisible(target)) > 0;
  }

  async waitForHidden(target: Locator): Promise<boolean> {
    return (await this.countVisible(target)) === 0;
  }

  pollText(target: Locator | null, matches: (text: string) => boolean): Promise<PollResult> {
    const text = target ? (this.texts.get(Locator.describe(target)) ?? '') : this.pageText;
    return Promise.resolve({ matched: matches(text), actual: text });
  }

  pollValue(target: Locator, matches: (value: string) => boolean): Promise<PollResult> {
    const value = this.values.get(Locator.describe(target)) ?? '';
    return Promise.resolve({ matched: matches(value), actual: value });
  }

  pollUrl(matches: (url: string) => boolean): Promise<PollResult> {
    return Promise.resolve({ matched: matches(this.url), actual: this.url });
  }

  screenshot(): Promise<Uint8Array> {
    return Promise.resolve(FAKE_JPEG);
  }

  drainFindings(): RawFinding[] {
    const drained = this.findings;
    this.findings = [];
    return drained;
  }

  close(): Promise<void> {
    this.closed = true;
    return Promise.resolve();
  }

  private interact(kind: string, target: Locator, operand?: string): Promise<void> {
    const key = Locator.describe(target);
    const failure = this.failures.get(key);
    const count = this.visible.get(key) ?? 0;
    if (failure) return Promise.reject(new BrowserError(failure, `${kind} failed on ${key}`));
    if (count === 0) return Promise.reject(new BrowserError('not-found', `No ${key}`));
    if (count > 1)
      return Promise.reject(new BrowserError('ambiguous', `${count} matches for ${key}`));
    this.calls.push(operand === undefined ? `${kind} ${key}` : `${kind} ${key} ${operand}`);
    return Promise.resolve();
  }
}
