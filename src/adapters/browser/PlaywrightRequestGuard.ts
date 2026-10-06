import type { BrowserContext, Route, WebSocketRoute } from 'playwright';
import type { ITargetPolicy } from '@/core/ports';

export type BlockedRequestListener = (url: string) => void;

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

/**
 * Checks every request the agent's browser makes against the target policy (CLAUDE.md section 4,
 * item 2). Playwright calls route handlers only for the first hop of a redirect, so requests are
 * fetched here with redirects off and each Location is checked before the browser follows it.
 */
export class PlaywrightRequestGuard {
  constructor(
    private readonly policy: ITargetPolicy,
    private readonly onBlocked: BlockedRequestListener,
  ) {}

  async install(context: BrowserContext): Promise<void> {
    await context.route('**/*', (route) => this.handle(route));
    await context.routeWebSocket(/.*/, (socket) => this.handleSocket(socket));
  }

  private async handle(route: Route): Promise<void> {
    const url = route.request().url();
    try {
      if (!(await this.policy.isAllowed(url))) {
        await this.block(route, url);
        return;
      }
      const response = await route.fetch({ maxRedirects: 0 });
      const location = response.headers()['location'];
      if (REDIRECT_STATUSES.has(response.status()) && location) {
        const next = new URL(location, url).href;
        if (!(await this.policy.isAllowed(next))) {
          await this.block(route, next);
          return;
        }
      }
      await route.fulfill({ response });
    } catch {
      // The request failed, or its page closed mid-flight. Either way the browser should treat
      // it as a failed load; abort can itself fail once the context is gone, which is harmless.
      await route.abort('failed').catch(() => undefined);
    }
  }

  private async handleSocket(socket: WebSocketRoute): Promise<void> {
    const url = socket.url();
    if (await this.policy.isAllowed(url.replace(/^ws/, 'http'))) {
      socket.connectToServer();
      return;
    }
    this.onBlocked(url);
    await socket.close();
  }

  private async block(route: Route, url: string): Promise<void> {
    this.onBlocked(url);
    await route.abort('blockedbyclient');
  }
}
