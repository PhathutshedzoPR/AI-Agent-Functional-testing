import { BrowserError } from '../errors';
import type { IBrowserSession, PageSnapshot, RawFinding } from '../ports';

export type ExploreOptions = Readonly<{ maxPages: number; snapshotMaxChars: number }>;

export type ExploreResult = Readonly<{
  pages: readonly PageSnapshot[];
  findings: readonly RawFinding[];
}>;

/**
 * Breadth-first crawl of the target, reading each page's accessibility tree. It stays on the start
 * URL's origin and under its path, and records links that fail to load as broken-link findings.
 */
export class SiteExplorer {
  constructor(private readonly options: ExploreOptions) {}

  async explore(
    session: IBrowserSession,
    start: URL,
    onPage: (page: PageSnapshot) => Promise<void>,
  ): Promise<ExploreResult> {
    const startUrl = withoutHash(start);
    const queue = [startUrl];
    const seen = new Set(queue);
    const pages: PageSnapshot[] = [];
    const findings: RawFinding[] = [];

    for (
      let url = queue.shift();
      url && pages.length < this.options.maxPages;
      url = queue.shift()
    ) {
      const page = await this.visit(session, url, findings);
      // The page's own failed response duplicates the broken-link finding just recorded.
      const reported = new Set(findings.map((finding) => finding.url));
      findings.push(
        ...session
          .drainFindings()
          .filter((finding) => !(finding.kind === 'http-error' && reported.has(finding.url))),
      );
      if (!page) continue;
      pages.push(page);
      await onPage(page);
      for (const link of await session.links()) {
        const next = this.inScope(link, start);
        if (next && !seen.has(next)) {
          seen.add(next);
          queue.push(next);
        }
      }
    }
    return { pages, findings };
  }

  private async visit(
    session: IBrowserSession,
    url: string,
    findings: RawFinding[],
  ): Promise<PageSnapshot | null> {
    let status: number | null;
    try {
      status = await session.goto(url);
    } catch (error) {
      if (!(error instanceof BrowserError)) throw error;
      findings.push({
        kind: 'broken-link',
        message: `${url} could not be opened`,
        url,
        status: null,
      });
      return null;
    }
    if (status !== null && status >= 400) {
      findings.push({ kind: 'broken-link', message: `${url} returned ${status}`, url, status });
      return null;
    }
    return session.snapshot(this.options.snapshotMaxChars);
  }

  /** The link without its fragment when it is on the same origin and under the start path. */
  private inScope(link: string, start: URL): string | null {
    let url: URL;
    try {
      url = new URL(link);
    } catch {
      return null;
    }
    const base = start.pathname.replace(/\/$/, '');
    const underStart = url.pathname === base || url.pathname.startsWith(`${base}/`);
    return url.origin === start.origin && underStart ? withoutHash(url) : null;
  }
}

function withoutHash(url: URL): string {
  const copy = new URL(url.href);
  copy.hash = '';
  return copy.href;
}
