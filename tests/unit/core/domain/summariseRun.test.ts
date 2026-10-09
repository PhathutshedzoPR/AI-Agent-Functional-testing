import { describe, expect, it } from 'vitest';
import { EMPTY_RUN_VIEW, summariseRun, type RunView } from '@/core/domain';
import { aBug } from '../../../fakes/domainBuilders';

const finished = (overrides: Partial<RunView>): RunView => ({
  ...EMPTY_RUN_VIEW,
  status: 'passed',
  durationMs: 14_200,
  ...overrides,
});

describe('summariseRun', () => {
  it('says nothing while the run is still going', () => {
    expect(summariseRun({ ...EMPTY_RUN_VIEW, status: 'running' })).toBeNull();
  });

  it('counts real steps and time for a clean pass', () => {
    const summary = summariseRun(
      finished({ stats: { passed: 17, healed: 0, failed: 0, skipped: 0, bugs: 0 } }),
    );

    expect(summary).toMatchObject({
      state: 'passed',
      headline: 'Every check passed: 17 steps in 14 s.',
    });
  });

  it('flags a pass that needed repairs for review', () => {
    const summary = summariseRun(
      finished({ stats: { passed: 10, healed: 7, failed: 0, skipped: 0, bugs: 0 } }),
    );

    expect(summary?.state).toBe('healed');
    expect(summary?.headline).toBe('Passed after 7 repairs: 17 steps in 14 s.');
    expect(summary?.hint).toContain('Needs review');
  });

  it('names the bugs and suggests checking the plan elsewhere', () => {
    const summary = summariseRun(
      finished({
        status: 'failed',
        durationMs: 75_000,
        bugs: [aBug()],
        stats: { passed: 15, healed: 0, failed: 1, skipped: 2, bugs: 1 },
      }),
    );

    expect(summary?.headline).toBe('1 bug found: 1 of 16 steps failed in 1 min 15 s.');
    expect(summary?.hint).toContain('Is it the site or the test?');
  });

  it('keeps stopped and broken runs short', () => {
    expect(summariseRun(finished({ status: 'cancelled' }))?.headline).toBe('You stopped this run.');
    expect(summariseRun(finished({ status: 'error', durationMs: null }))).toEqual({
      state: 'failed',
      headline: 'The run stopped before it finished.',
      hint: null,
    });
  });
});
