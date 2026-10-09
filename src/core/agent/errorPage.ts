import { AssertionFailedError } from '../errors';
import type { IBrowserSession } from '../ports';

// "Not here" or "broken" answers. 401, 403 and 4xx validation answers can be a page doing its job.
const isPageError = (status: number | null): status is number =>
  status !== null && (status === 404 || status === 410 || status >= 500);

/**
 * A step that ends on a page whose address answers 404, 410 or 5xx has failed, whatever the plan
 * checks next: a link that leads to "not found" is broken. The status comes from the site itself
 * (see IBrowserSession.pageStatus), because single-page apps show a missing page after a 200.
 */
export function errorPageFailure(url: string, status: number | null): AssertionFailedError | null {
  if (!isPageError(status)) return null;
  return new AssertionFailedError(
    `${new URL(url).pathname} to load`,
    `the server answered ${String(status)} for it`,
  );
}

/** Asks the site once per new address (per scenario) whether the page a step landed on exists. */
export async function landedOnErrorPage(
  session: IBrowserSession,
  checked: Set<string>,
): Promise<AssertionFailedError | null> {
  const url = session.currentUrl();
  if (!/^https?:/.test(url) || checked.has(url)) return null;
  checked.add(url);
  return errorPageFailure(url, await session.pageStatus());
}
