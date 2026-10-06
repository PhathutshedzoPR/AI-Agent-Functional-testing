import type { ConsoleMessage, Page, Response } from 'playwright';
import type { RawFinding } from '@/core/ports';

// Chromium logs one of these for every failed load; the http-error finding already covers it.
const DUPLICATE_CONSOLE_PREFIX = 'Failed to load resource';

/** Collects what the page reports on its own: console errors, uncaught errors, 4xx/5xx responses. */
export class PageFindingRecorder {
  private findings: RawFinding[] = [];

  constructor(private readonly page: Page) {
    page.on('console', (message) => this.onConsole(message));
    page.on('pageerror', (error) => {
      this.record({ kind: 'page-error', message: error.message, url: page.url(), status: null });
    });
    page.on('response', (response) => this.onResponse(response));
  }

  /** Records a request the target policy stopped. */
  blocked(url: string): void {
    this.record({
      kind: 'blocked-request',
      message: `Blocked a request to ${url}`,
      url,
      status: null,
    });
  }

  drain(): RawFinding[] {
    const drained = this.findings;
    this.findings = [];
    return drained;
  }

  private onConsole(message: ConsoleMessage): void {
    const text = message.text();
    if (message.type() !== 'error' || text.startsWith(DUPLICATE_CONSOLE_PREFIX)) return;
    this.record({ kind: 'console-error', message: text, url: this.page.url(), status: null });
  }

  private onResponse(response: Response): void {
    const status = response.status();
    if (status < 400) return;
    this.record({
      kind: 'http-error',
      message: `${response.request().method()} ${response.url()} returned ${status}`,
      url: response.url(),
      status,
    });
  }

  private record(finding: RawFinding): void {
    this.findings.push({ ...finding, message: finding.message.slice(0, 500) });
  }
}
