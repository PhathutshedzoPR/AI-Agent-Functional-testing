import type { IBrowserSession } from './IBrowserSession';

export type BrowserLaunchOptions = Readonly<{
  headless: boolean;
  slowMoMs: number;
  stepTimeoutMs: number;
}>;

/** One real browser for the length of a run. Each scenario gets its own fresh session. */
export interface IBrowser {
  newSession(): Promise<IBrowserSession>;
  close(): Promise<void>;
}

/** Launches browsers (Factory). Implementations enforce the target policy on every request. */
export interface IBrowserFactory {
  launch(options: BrowserLaunchOptions): Promise<IBrowser>;
}
