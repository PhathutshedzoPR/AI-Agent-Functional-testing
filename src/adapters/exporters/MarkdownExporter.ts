import {
  CRITERION_VERDICT_LABELS,
  DEVICE_LABELS,
  Locator,
  RUN_STATUS_LABELS,
  STEP_STATUS_LABELS,
  traceCriteria,
  type BugReport,
  type Device,
  type RunView,
} from '@/core/domain';
import type { ExportedReport, IReportExporter } from '@/core/ports';
import { DEVICE_PROFILE_NAMES, deviceContextOptions } from '../browser/deviceProfiles';
import { auditEntries } from './auditEntries';
import { reportFileName } from './reportFileName';

/** The screen the run used, with its size, so a reader can reproduce it exactly. */
function screenOf(device: Device): string {
  const viewport = deviceContextOptions(device).viewport;
  const size = viewport ? `${viewport.width} x ${viewport.height}` : 'default size';
  return device === 'desktop'
    ? `Desktop (${size})`
    : `${DEVICE_LABELS[device]} (${size}, Playwright's ${DEVICE_PROFILE_NAMES[device]} profile in Chromium)`;
}

/** Neutralises Markdown in text that came from the site under test (links, images, tables). */
export function mdEscape(text: string): string {
  return text.replace(/[\\`*_{}[\]()<>#+!|~]/g, '\\$&').replace(/\r?\n/g, ' ');
}

function header(view: RunView): string[] {
  const limit = view.limits ? ' of ' + String(view.limits.maxLlmCalls) : '';
  const duration =
    view.durationMs === null ? 'not finished' : `${(view.durationMs / 1_000).toFixed(1)} s`;
  return [
    `# TestPilot report: ${mdEscape(view.targetLabel ?? 'run')}`,
    '',
    `- Result: ${RUN_STATUS_LABELS[view.status]}`,
    `- Target: ${mdEscape(view.targetUrl ?? '')}`,
    `- Screen: ${screenOf(view.device)}`,
    `- Started: ${view.startedAt ?? 'not started'}`,
    `- Duration: ${duration}`,
    `- Plan: ${view.replayed ? 'replayed from a recording' : 'planned live by the LLM'}`,
    `- LLM calls: ${view.llmCallsUsed}${limit}`,
    '',
  ];
}

function scenarioTable(view: RunView): string[] {
  if (view.scenarios.length === 0) return [];
  return [
    '## Scenarios',
    '',
    '| Scenario | Kind | Criterion | Result |',
    '|---|---|---|---|',
    ...view.scenarios.map(
      (s) =>
        `| ${mdEscape(s.title)} | ${s.kind} | ${mdEscape(s.criterion ?? '-')} | ${STEP_STATUS_LABELS[s.state]} |`,
    ),
    '',
  ];
}

function traceability(view: RunView): string[] {
  const rows = traceCriteria(view);
  if (rows.length === 0) return [];
  return [
    '## Traceability',
    '',
    ...(view.criteriaInferred
      ? ['The story had no acceptance criteria, so TestPilot proposed these.', '']
      : []),
    '| Criterion | Scenarios | Result |',
    '|---|---|---|',
    ...rows.map(
      (row) =>
        `| ${mdEscape(row.criterion ?? 'Not linked to a criterion')} | ${row.scenarios.map((s) => mdEscape(s.title)).join(', ') || '-'} | ${CRITERION_VERDICT_LABELS[row.verdict]} |`,
    ),
    '',
  ];
}

function bugSection(bug: BugReport, index: number, runId: string | null): string[] {
  return [
    `### ${index + 1}. ${mdEscape(bug.title)}`,
    '',
    `Severity: ${bug.severity}`,
    '',
    'Steps to reproduce:',
    '',
    ...bug.stepsToReproduce.map((step, i) => `${i + 1}. ${mdEscape(step)}`),
    '',
    `Expected: ${mdEscape(bug.expected)}`,
    '',
    `Actual: ${mdEscape(bug.actual)}`,
    '',
    ...(bug.screenshotStepId && runId
      ? [`Screenshot: /api/runs/${runId}/steps/${bug.screenshotStepId}/screenshot`, '']
      : []),
  ];
}

function needsReview(view: RunView): string[] {
  const healed = view.scenarios.flatMap((s) =>
    s.steps.flatMap((step) =>
      step.result?.healing ? [{ scenario: s.title, healing: step.result.healing }] : [],
    ),
  );
  if (healed.length === 0) return [];
  return [
    '## Needs review',
    '',
    'These steps passed only after TestPilot found a replacement for a broken locator. Check each one is the same control, not a regression.',
    '',
    ...healed.map(
      ({ scenario, healing }) =>
        `- ${mdEscape(scenario)}: ${mdEscape(Locator.describe(healing.from))} became ${mdEscape(Locator.describe(healing.to))} (${healing.method}). ${mdEscape(healing.reason)}`,
    ),
    '',
  ];
}

function pageChecks(view: RunView): string[] {
  const entries = auditEntries(view);
  if (entries.length === 0) return [];
  const failed = entries.filter(({ check }) => check.status === 'failed').length;
  return [
    '## Performance and security',
    '',
    `${failed} of ${entries.length} checks failed. Timings were measured in the browser on each page the agent read; security checks are passive and read only the page's own response.`,
    '',
    '| Page | Check | Result | Measured | Expected |',
    '|---|---|---|---|---|',
    ...entries.map(
      ({ page, check }) =>
        `| ${mdEscape(page)} | ${mdEscape(check.name)} | ${check.status} | ${mdEscape(check.actual)} | ${mdEscape(check.expected)} |`,
    ),
    '',
  ];
}

/** A readable report with one GitHub-issue-ready section per bug. */
export class MarkdownExporter implements IReportExporter {
  readonly format = 'markdown';

  export(view: RunView): ExportedReport {
    const bugs =
      view.bugs.length === 0
        ? ['## Bugs', '', 'No bugs found.', '']
        : ['## Bugs', '', ...view.bugs.flatMap((bug, i) => bugSection(bug, i, view.runId))];
    const findings =
      view.findings.length === 0
        ? []
        : [
            '## Findings',
            '',
            ...view.findings.map((f) => `- ${f.kind}: ${mdEscape(f.message)}`),
            '',
          ];
    const body = [
      ...header(view),
      ...scenarioTable(view),
      ...traceability(view),
      ...bugs,
      ...needsReview(view),
      ...pageChecks(view),
      ...findings,
    ].join('\n');
    return {
      fileName: reportFileName(view, 'md'),
      contentType: 'text/markdown; charset=utf-8',
      body,
    };
  }
}
