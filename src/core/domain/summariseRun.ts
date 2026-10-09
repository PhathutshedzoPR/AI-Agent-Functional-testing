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

function took(ms: number | null): string {
  if (ms === null) return '';
  const seconds = Math.max(1, Math.round(ms / 1_000));
  return seconds < 60
    ? ` in ${seconds} s`
    : ` in ${Math.floor(seconds / 60)} min ${seconds % 60} s`;
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
