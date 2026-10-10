import { describe, expect, it } from 'vitest';
import { EMPTY_RUN_VIEW, summariseRun, type RunView } from '@/core/domain';
import { aBug } from '../../../fakes/domainBuilders';

// Numbers and units are joined with a no-break space; compare with plain spaces.
const plain = (text: string | undefined): string | undefined => text?.replace(/ /g, ' ');

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

    expect(summary?.state).toBe('passed');
    expect(plain(summary?.headline)).toBe('Every check passed: 17 steps in 14 s.');
  });

  it('flags a pass that needed repairs for review', () => {
    const summary = summariseRun(
      finished({ stats: { passed: 10, healed: 7, failed: 0, skipped: 0, bugs: 0 } }),
    );

    expect(summary?.state).toBe('healed');
    expect(plain(summary?.headline)).toBe('Passed after 7 repairs: 17 steps in 14 s.');
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

    expect(plain(summary?.headline)).toBe('1 bug found: 1 of 16 steps failed in 1 min 15 s.');
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

  it('sums up a quick scan by its checks and the links that did not load', () => {
    const check = (status: 'passed' | 'failed') =>
      ({
        category: 'security',
        name: `check ${status}`,
        status,
        actual: '',
        expected: '',
      }) as const;
    const page = (url: string, statuses: ('passed' | 'failed')[]) => ({
      url,
      title: '',
      audit: { url, checks: statuses.map(check) },
      screenshotId: null,
    });
    const clean = finished({
      scan: true,
      pages: [page('https://a.example/', ['passed', 'passed'])],
    });
    const broken = finished({
      scan: true,
      status: 'failed',
      pages: [
        page('https://a.example/', ['passed', 'failed']),
        page('https://a.example/b', ['failed']),
      ],
      findings: [
        {
          id: 'f1',
          kind: 'broken-link',
          message: 'gone',
          url: 'https://a.example/c',
          status: 404,
          scenarioId: null,
          stepId: null,
        },
      ],
    });

    expect(plain(summariseRun(clean)?.headline)).toBe(
      'Scanned 1 page: every check passed in 14 s.',
    );
    expect(summariseRun(broken)).toMatchObject({ state: 'failed' });
    expect(plain(summariseRun(broken)?.headline)).toBe(
      'Scanned 2 pages: 2 of 3 checks failed, and 1 link did not load in 14 s.',
    );
  });
});
