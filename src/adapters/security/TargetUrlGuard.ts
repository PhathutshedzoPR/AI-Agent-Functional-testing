import ipaddr from 'ipaddr.js';
import { TargetBlockedError } from '@/core/errors';
import type { ITargetPolicy } from '@/core/ports';

/** Returns every address a hostname resolves to. */
export type HostResolver = (hostname: string) => Promise<readonly string[]>;

export type TargetGuardOptions = Readonly<{
  mode: 'allowlist' | 'public';
  /** `host` or `host:port` entries, lowercase. Used in allowlist mode. */
  allowlist: readonly string[];
  /** TestPilot's own origin. Its `/api/*` routes are never reachable from the agent's browser. */
  appBaseUrl: URL;
  maxUrlChars: number;
}>;

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

/**
 * SSRF guard (CLAUDE.md section 4, item 2). Allowlist mode accepts only listed hosts. Public mode
 * resolves the host and accepts it only when every address is ordinary public unicast.
 * Known gap: DNS can change between this check and the browser's own lookup (rebinding).
 */
export class TargetUrlGuard implements ITargetPolicy {
  constructor(
    private readonly options: TargetGuardOptions,
    private readonly resolveHost: HostResolver,
  ) {}

  async assertAllowed(raw: string): Promise<URL> {
    const url = this.parse(raw);
    if (this.isOwnApi(url)) {
      throw new TargetBlockedError("TestPilot's own API is off limits");
    }
    if (this.options.mode === 'allowlist') {
      if (!this.isAllowlisted(url)) {
        throw new TargetBlockedError(`${url.host} is not on the allowlist`);
      }
      return url;
    }
    await this.assertPublicHost(url.hostname);
    return url;
  }

  async isAllowed(raw: string): Promise<boolean> {
    try {
      await this.assertAllowed(raw);
      return true;
    } catch (error) {
      if (error instanceof TargetBlockedError) return false;
      throw error;
    }
  }

  private parse(raw: string): URL {
    if (raw.length > this.options.maxUrlChars) {
      throw new TargetBlockedError('the URL is too long');
    }
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      throw new TargetBlockedError('it is not a valid URL');
    }
    if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
      throw new TargetBlockedError('only http and https are supported');
    }
    if (url.username || url.password) {
      throw new TargetBlockedError('URLs with credentials are not accepted');
    }
    return url;
  }

  private isOwnApi(url: URL): boolean {
    return (
      url.origin === this.options.appBaseUrl.origin &&
      (url.pathname === '/api' || url.pathname.startsWith('/api/'))
    );
  }

  private isAllowlisted(url: URL): boolean {
    const host = url.host.toLowerCase();
    const hostname = url.hostname.toLowerCase();
    return this.options.allowlist.some((entry) =>
      entry.includes(':') && !entry.startsWith('[') ? entry === host : entry === hostname,
    );
  }

  private async assertPublicHost(hostname: string): Promise<void> {
    const literal = hostname.replace(/^\[|\]$/g, '');
    const addresses = ipaddr.isValid(literal) ? [literal] : await this.lookup(hostname);
    if (addresses.length === 0) {
      throw new TargetBlockedError('the host did not resolve');
    }
    for (const address of addresses) {
      if (!ipaddr.isValid(address)) {
        throw new TargetBlockedError('the host resolved to an invalid address');
      }
      // process() unwraps IPv4-mapped IPv6 (::ffff:a.b.c.d) so it is judged as IPv4.
      const range = ipaddr.process(address).range();
      if (range !== 'unicast') {
        throw new TargetBlockedError(`it points to a ${range} address`);
      }
    }
  }

  private async lookup(hostname: string): Promise<readonly string[]> {
    try {
      return await this.resolveHost(hostname);
    } catch {
      throw new TargetBlockedError('the host did not resolve');
    }
  }
}
