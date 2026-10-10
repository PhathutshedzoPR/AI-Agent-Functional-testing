import { PERFORMANCE_BUDGETS, type AuditCheck } from '../../domain';
import type { PageMeasurement } from '../../ports';

const ms = (value: number): string => `${Math.round(value)} ms`;

function withinBudget(name: string, measured: number | null, budgetMs: number): AuditCheck {
  const expected = `at most ${ms(budgetMs)}`;
  if (measured === null) {
    return { category: 'performance', name, status: 'skipped', actual: 'not reported', expected };
  }
  return {
    category: 'performance',
    name,
    status: measured <= budgetMs ? 'passed' : 'failed',
    actual: ms(measured),
    expected,
  };
}

/** Timings the browser measured for the page, each against its budget. */
export function performanceChecks(page: PageMeasurement): AuditCheck[] {
  return [
    withinBudget(
      'Server answers quickly (time to first byte)',
      page.ttfbMs,
      PERFORMANCE_BUDGETS.ttfbMs,
    ),
    withinBudget(
      'Main content shows quickly (Largest Contentful Paint)',
      page.lcpMs,
      PERFORMANCE_BUDGETS.lcpMs,
    ),
    withinBudget('Page finishes loading', page.loadMs, PERFORMANCE_BUDGETS.loadMs),
  ];
}
