import type { FindingKind, Locator } from '../domain';

export type PageSnapshot = Readonly<{
  url: string;
  title: string;
  /** YAML accessibility tree of the page body, trimmed to the run's snapshot budget. */
  aria: string;
}>;

/** A browser-reported problem before it is tied to a run, scenario and step. */
export type RawFinding = Readonly<{
  kind: FindingKind;
  message: string;
  url: string;
  status: number | null;
}>;

/**
 * What the browser measured for the page it last opened with goto: timings in milliseconds from
 * the start of navigation (null when the browser did not report one), the main response's
 * headers with lower-case names, and the cookies the page can see.
 */
export type PageMeasurement = Readonly<{
  url: string;
  ttfbMs: number | null;
  loadMs: number | null;
  lcpMs: number | null;
  headers: Readonly<Record<string, string>>;
  cookies: readonly Readonly<{ name: string; secure: boolean }>[];
}>;

export type PollResult = Readonly<{ matched: boolean; actual: string }>;

/**
 * One isolated browser context and page, used for a single scenario (Adapter over Playwright).
 * Interactions throw BrowserError; `not-found` and `ambiguous` failures mean the locator did not
 * match exactly one visible element. Waits use the run's step timeout.
 */
export interface IBrowserSession {
  /** Opens a URL and returns the HTTP status of the main response, or null when there is none. */
  goto(url: string): Promise<number | null>;
  currentUrl(): string;
  /**
   * The HTTP status the current page's address answers with when requested again, or null when
   * unknown. Single-page apps render a missing page after a 200 fetch, so this asks the site.
   */
  pageStatus(): Promise<number | null>;
  snapshot(maxChars: number): Promise<PageSnapshot>;
  /** Timings, headers and cookies of the page last opened with goto. */
  measurePage(): Promise<PageMeasurement>;
  /** Absolute URLs of the visible links on the page, in document order. */
  links(): Promise<string[]>;

  click(target: Locator): Promise<void>;
  check(target: Locator): Promise<void>;
  fill(target: Locator, value: string): Promise<void>;
  selectOption(target: Locator, label: string): Promise<void>;
  press(target: Locator | null, key: string): Promise<void>;

  /** Number of visible elements the locator matches right now. */
  countVisible(target: Locator): Promise<number>;
  /** Waits until at least one match is visible; false on timeout. */
  waitForVisible(target: Locator): Promise<boolean>;
  /** Waits until no match is visible; false on timeout. */
  waitForHidden(target: Locator): Promise<boolean>;
  /** Polls the visible text of the matches (or the whole page) until `matches` holds. */
  pollText(target: Locator | null, matches: (text: string) => boolean): Promise<PollResult>;
  /** Polls a form field's value until `matches` holds. */
  pollValue(target: Locator, matches: (value: string) => boolean): Promise<PollResult>;
  /** Polls the page URL until `matches` holds. */
  pollUrl(matches: (url: string) => boolean): Promise<PollResult>;

  screenshot(): Promise<Uint8Array>;
  /** Findings recorded since the previous call. */
  drainFindings(): RawFinding[];
  close(): Promise<void>;
}
