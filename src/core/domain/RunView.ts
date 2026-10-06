import type { BugReport } from './BugReport';
import type { Finding } from './Finding';
import type { PlanStep } from './PlanStep';
import type { RunLimits, SafeError } from './RunEvent';
import type { Scenario, ScenarioStatus } from './Scenario';
import type { StepResult, StepStatus } from './StepResult';
import type { RunStatus } from './TestRun';

export type StepState = 'pending' | 'running' | StepStatus;
export type ScenarioState = 'pending' | 'running' | ScenarioStatus;

export type StepView = Readonly<PlanStep & { state: StepState; result: StepResult | null }>;

export type ScenarioView = Readonly<
  Omit<Scenario, 'steps'> & { state: ScenarioState; steps: readonly StepView[] }
>;

export type FeedTone = 'info' | 'good' | 'warn' | 'bad';
export type FeedItem = Readonly<{ seq: number; at: string; text: string; tone: FeedTone }>;

export type RunStats = Readonly<{
  passed: number;
  healed: number;
  failed: number;
  skipped: number;
  bugs: number;
}>;

/** Everything the UI shows about a run, derived only from its events (see projectRun). */
export type RunView = Readonly<{
  runId: string | null;
  status: RunStatus;
  targetUrl: string | null;
  targetLabel: string | null;
  story: string | null;
  replayed: boolean;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs: number | null;
  limits: RunLimits | null;
  pages: readonly Readonly<{ url: string; title: string }>[];
  summary: string | null;
  warnings: readonly string[];
  criteria: readonly string[];
  criteriaInferred: boolean;
  scenarios: readonly ScenarioView[];
  findings: readonly Finding[];
  bugs: readonly BugReport[];
  llmCallsUsed: number;
  stats: RunStats;
  activeStepId: string | null;
  error: SafeError | null;
  feed: readonly FeedItem[];
  lastSeq: number;
}>;

export const EMPTY_STATS: RunStats = { passed: 0, healed: 0, failed: 0, skipped: 0, bugs: 0 };

export const EMPTY_RUN_VIEW: RunView = {
  runId: null,
  status: 'queued',
  targetUrl: null,
  targetLabel: null,
  story: null,
  replayed: false,
  startedAt: null,
  finishedAt: null,
  durationMs: null,
  limits: null,
  pages: [],
  summary: null,
  warnings: [],
  criteria: [],
  criteriaInferred: false,
  scenarios: [],
  findings: [],
  bugs: [],
  llmCallsUsed: 0,
  stats: EMPTY_STATS,
  activeStepId: null,
  error: null,
  feed: [],
  lastSeq: 0,
};
