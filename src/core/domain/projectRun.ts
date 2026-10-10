import { narrateEvent } from './narrateEvent';
import type { RunEvent, RunEventOf, RunEventType } from './RunEvent';
import {
  EMPTY_RUN_VIEW,
  type RunStats,
  type RunView,
  type ScenarioView,
  type StepView,
} from './RunView';
import type { StepResult } from './StepResult';

type Handler<T extends RunEventType> = (view: RunView, event: RunEventOf<T>) => RunView;

const updateScenario = (
  view: RunView,
  scenarioId: string,
  update: (scenario: ScenarioView) => ScenarioView,
): RunView => ({
  ...view,
  scenarios: view.scenarios.map((s) => (s.id === scenarioId ? update(s) : s)),
});

const updateStep = (
  scenario: ScenarioView,
  stepId: string,
  update: (step: StepView) => StepView,
): ScenarioView => ({
  ...scenario,
  steps: scenario.steps.map((step) => (step.id === stepId ? update(step) : step)),
});

function countResult(stats: RunStats, result: StepResult): RunStats {
  return { ...stats, [result.status]: stats[result.status] + 1 };
}

// One small handler per event type keeps the reducer flat (Sonar cognitive complexity).
const HANDLERS: { [T in RunEventType]: Handler<T> } = {
  'run.started': (view, e) => ({
    ...view,
    runId: e.runId,
    status: 'running',
    targetUrl: e.targetUrl,
    targetLabel: e.targetLabel,
    story: e.story,
    replayed: e.replayed,
    device: e.device,
    scan: e.scan,
    startedAt: e.at,
    limits: e.limits,
  }),
  'explore.page': (view, e) => ({
    ...view,
    pages: [
      ...view.pages,
      { url: e.url, title: e.title, audit: e.audit, screenshotId: e.screenshotId },
    ],
  }),
  'plan.ready': (view, e) => ({
    ...view,
    summary: e.plan.summary,
    warnings: e.warnings,
    criteria: e.criteria,
    criteriaInferred: e.criteriaInferred,
    scenarios: e.plan.scenarios.map((scenario) => ({
      ...scenario,
      state: 'pending',
      steps: scenario.steps.map((step) => ({ ...step, state: 'pending', result: null })),
    })),
  }),
  'llm.called': (view, e) => ({ ...view, llmCallsUsed: e.used }),
  'scenario.started': (view, e) =>
    updateScenario(view, e.scenarioId, (s) => ({ ...s, state: 'running' })),
  'step.started': (view, e) => ({
    ...updateScenario(view, e.scenarioId, (s) =>
      updateStep(s, e.stepId, (step) => ({ ...step, state: 'running' })),
    ),
    activeStepId: e.stepId,
  }),
  'step.finished': (view, e) => ({
    ...updateScenario(view, e.result.scenarioId, (s) =>
      updateStep(s, e.result.stepId, (step) => ({
        ...step,
        state: e.result.status,
        result: e.result,
      })),
    ),
    stats: countResult(view.stats, e.result),
  }),
  finding: (view, e) => ({ ...view, findings: [...view.findings, e.finding] }),
  'scenario.finished': (view, e) =>
    updateScenario(view, e.scenarioId, (s) => ({ ...s, state: e.status })),
  'bug.reported': (view, e) => ({
    ...view,
    bugs: [...view.bugs, e.bug],
    stats: { ...view.stats, bugs: view.stats.bugs + 1 },
  }),
  'run.finished': (view, e) => ({
    ...view,
    status: e.status,
    finishedAt: e.at,
    durationMs: e.durationMs,
    activeStepId: null,
  }),
  'run.failed': (view, e) => ({
    ...view,
    status: 'error',
    finishedAt: e.at,
    error: e.error,
    activeStepId: null,
  }),
  'run.cancelled': (view, e) => ({
    ...view,
    status: 'cancelled',
    finishedAt: e.at,
    activeStepId: null,
  }),
};

/**
 * Applies one event to a view. Events at or below the last seen `seq` are ignored, so replays
 * and reconnects never double-count.
 */
export function applyRunEvent(view: RunView, event: RunEvent): RunView {
  if (event.seq <= view.lastSeq) return view;
  const handler = HANDLERS[event.type] as Handler<typeof event.type>;
  const next = handler(view, event);
  const line = narrateEvent(event, next);
  return {
    ...next,
    lastSeq: event.seq,
    feed: line ? [...next.feed, { seq: event.seq, at: event.at, ...line }] : next.feed,
  };
}

/** Folds a run's events into the view the dashboard shows (pure; used on server and client). */
export function projectRun(events: readonly RunEvent[], from: RunView = EMPTY_RUN_VIEW): RunView {
  return [...events]
    .sort((a, b) => a.seq - b.seq)
    .reduce((view, event) => applyRunEvent(view, event), from);
}
