import type { ScenarioView } from './RunView';
import { normaliseText } from './textMatching';

/** How far a criterion got: the worst result among the scenarios that check it. */
export type CriterionVerdict = 'untested' | 'pending' | 'running' | 'passed' | 'healed' | 'failed';

export type TraceRow = Readonly<{
  /** Null groups the scenarios the planner did not link to any criterion. */
  criterion: string | null;
  verdict: CriterionVerdict;
  scenarios: readonly ScenarioView[];
}>;

type TraceInput = Readonly<{ criteria: readonly string[]; scenarios: readonly ScenarioView[] }>;

const EDGE_PUNCTUATION = new Set(['.', ';', ':', '!', '-', '*']);

// The planner copies criteria from the story, but may change case, drop a full stop or keep a
// bullet mark; punctuation at either end does not change which criterion it means.
function key(criterion: string): string {
  const text = normaliseText(criterion);
  let start = 0;
  let end = text.length;
  while (start < end && (EDGE_PUNCTUATION.has(text.charAt(start)) || text.charAt(start) === ' ')) {
    start += 1;
  }
  while (end > start && EDGE_PUNCTUATION.has(text.charAt(end - 1))) end -= 1;
  return text.slice(start, end);
}

function verdictOf(scenarios: readonly ScenarioView[]): CriterionVerdict {
  const states = new Set(scenarios.map((scenario) => scenario.state));
  if (states.size === 0) return 'untested';
  if (states.has('failed')) return 'failed';
  if (states.has('running')) return 'running';
  if (states.has('pending')) return 'pending';
  return states.has('healed') ? 'healed' : 'passed';
}

/**
 * Traceability: every acceptance criterion with the scenarios that check it and their combined
 * result, in story order. Criteria no scenario checks show as untested rather than vanishing.
 */
export function traceCriteria(view: TraceInput): TraceRow[] {
  const groups = new Map<string, { criterion: string; scenarios: ScenarioView[] }>();
  for (const criterion of view.criteria) {
    if (!groups.has(key(criterion))) groups.set(key(criterion), { criterion, scenarios: [] });
  }
  const unlinked: ScenarioView[] = [];
  for (const scenario of view.scenarios) {
    if (scenario.criterion === null) {
      unlinked.push(scenario);
      continue;
    }
    const k = key(scenario.criterion);
    const group = groups.get(k) ?? { criterion: scenario.criterion, scenarios: [] };
    group.scenarios.push(scenario);
    groups.set(k, group);
  }
  const rows: TraceRow[] = [...groups.values()].map((group) => ({
    ...group,
    verdict: verdictOf(group.scenarios),
  }));
  if (unlinked.length > 0) {
    rows.push({ criterion: null, verdict: verdictOf(unlinked), scenarios: unlinked });
  }
  return rows;
}
