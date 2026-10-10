import { PageAudit } from './PageAudit';
import { plural } from './plural';
import type { RunView, StepState } from './RunView';
import { TestRun } from './TestRun';

export type RunSummaryText = Readonly<{
  /** Shown as icon plus word, like a step. */
  state: StepState;
  headline: string;
  /** What to try next, or null when there is nothing useful to suggest. */
  hint: string | null;
}>;

const NBSP = String.fromCharCode(0xa0);

function took(ms: number | null): string {
  if (ms === null) return '';
  const seconds = Math.max(1, Math.round(ms / 1_000));
  // A no-break space keeps a number and its unit on one line on a phone.
  const unit = (value: number, name: string): string => `${value}${NBSP}${name}`;
  return seconds < 60
    ? ` in ${unit(seconds, 's')}`
    : ` in ${unit(Math.floor(seconds / 60), 'min')} ${unit(seconds % 60, 's')}`;
}

/** A quick scan has no steps: its numbers are the checks on each page and the pages that failed to load. */
function summariseScan(view: RunView, time: string): RunSummaryText {
  const audits = view.pages.flatMap((page) => (page.audit ? [page.audit] : []));
  const checks = audits.reduce((count, audit) => count + audit.checks.length, 0);
  const failed = PageAudit.failed(audits);
  const broken = view.findings.filter((finding) => finding.kind === 'broken-link').length;
  const scanned = `Scanned ${plural(audits.length, 'page')}`;
  const brokenLinks = broken > 0 ? `, and ${plural(broken, 'link')} did not load` : '';
  const hint =
    'Open Performance & security for each page. To test what people do on the site, start a run with a story.';
  if (failed === 0 && broken === 0) {
    return { state: 'passed', headline: `${scanned}: every check passed${time}.`, hint };
  }
  return {
    state: 'failed',
    headline: `${scanned}: ${failed} of ${plural(checks, 'check')} failed${brokenLinks}${time}.`,
    hint,
  };
}

/** One plain sentence about a finished run, from its real numbers, and the next thing to try. */
export function summariseRun(view: RunView): RunSummaryText | null {
  if (!TestRun.isFinal(view.status)) return null;
  const { passed, healed, failed } = view.stats;
  const steps = plural(passed + healed + failed, 'step');
  const time = took(view.durationMs);
  if (view.status === 'cancelled') {
    return { state: 'skipped', headline: 'You stopped this run.', hint: null };
  }
  if (view.status === 'error') {
    return { state: 'failed', headline: 'The run stopped before it finished.', hint: null };
  }
  if (view.scan) return summariseScan(view, time);
  if (view.status === 'failed') {
    return {
      state: 'failed',
      headline: `${plural(view.bugs.length, 'bug')} found: ${failed} of ${steps} failed${time}.`,
      hint: 'Is it the site or the test? Run the same plan where the bug is not: if it passes there, the bug is real.',
    };
  }
  if (healed > 0) {
    return {
      state: 'healed',
      headline: `Passed after ${plural(healed, 'repair')}: ${steps}${time}.`,
      hint: 'Each repair is listed under Needs review. Check them before trusting this run.',
    };
  }
  return {
    state: 'passed',
    headline: `Every check passed: ${steps}${time}.`,
    hint: 'Try the same plan where things change: another release, or a phone screen.',
  };
}
