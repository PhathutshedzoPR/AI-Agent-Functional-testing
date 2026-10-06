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
  snapshot(maxChars: number): Promise<PageSnapshot>;
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
