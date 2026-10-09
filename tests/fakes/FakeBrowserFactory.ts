import type { BrowserLaunchOptions, IBrowser, IBrowserFactory } from '@/core/ports';
import { FakeBrowserSession } from './FakeBrowserSession';

/** Launches fake browsers whose sessions come from `makeSession`, and records what happened. */
export class FakeBrowserFactory implements IBrowserFactory {
  readonly launches: BrowserLaunchOptions[] = [];
  readonly sessions: FakeBrowserSession[] = [];
  closed = 0;

  constructor(
    private readonly makeSession: () => FakeBrowserSession = () => new FakeBrowserSession(),
  ) {}

  launch(options: BrowserLaunchOptions): Promise<IBrowser> {
    this.launches.push(options);
    const browser: IBrowser = {
      newSession: () => {
        const session = this.makeSession();
        this.sessions.push(session);
        return Promise.resolve(session);
      },
      close: () => {
        this.closed += 1;
        return Promise.resolve();
      },
    };
    return Promise.resolve(browser);
  }
}
