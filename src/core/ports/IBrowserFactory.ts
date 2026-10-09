import type { Device } from '../domain';
import type { IBrowserSession } from './IBrowserSession';

export type BrowserLaunchOptions = Readonly<{
  headless: boolean;
  slowMoMs: number;
  stepTimeoutMs: number;
  /** The screen every page of the run is opened on. */
  device: Device;
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
