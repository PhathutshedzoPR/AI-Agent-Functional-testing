import type { Page } from 'playwright';
import type { PageMeasurement } from '@/core/ports';

type PageTimings = Pick<PageMeasurement, 'ttfbMs' | 'loadMs' | 'lcpMs'>;

// Largest Contentful Paint entries are buffered, so a short wait is enough to read the latest.
const LCP_WAIT_MS = 200;

/**
 * Reads the browser's own Navigation Timing and Largest Contentful Paint entries for the current
 * page. A fixed function of ours runs in the page, never model-provided code (CLAUDE.md s4.4).
 */
export function readPageTimings(page: Page): Promise<PageTimings> {
  return page.evaluate(async (lcpWaitMs) => {
    const positive = (value: number | undefined): number | null =>
      value !== undefined && value > 0 ? Math.round(value) : null;
    const [navigation] = performance.getEntriesByType(
      'navigation',
    ) as PerformanceNavigationTiming[];
    const lcp = await new Promise<number | undefined>((resolve) => {
      let latest: number | undefined;
      const observer = new PerformanceObserver((list) => {
        latest = list.getEntries().at(-1)?.startTime ?? latest;
      });
      try {
        observer.observe({ type: 'largest-contentful-paint', buffered: true });
      } catch {
        resolve(undefined); // a browser without the entry type reports no LCP
        return;
      }
      setTimeout(() => {
        observer.disconnect();
        resolve(latest);
      }, lcpWaitMs);
    });
    return {
      ttfbMs: positive(navigation?.responseStart),
      loadMs: positive(navigation?.loadEventEnd),
      lcpMs: positive(lcp),
    };
  }, LCP_WAIT_MS);
}
