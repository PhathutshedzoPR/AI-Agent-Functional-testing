import { Locator, describeStep, type RunView, type ScenarioView } from '@/core/domain';
import type { ExportedReport, IReportExporter } from '@/core/ports';
import { auditEntries, type AuditEntry } from './auditEntries';
import { reportFileName } from './reportFileName';

const XML_ESCAPES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
};

/** Escapes text for XML content and attributes (CLAUDE.md section 4, item 8). */
export function xmlEscape(text: string): string {
  return text.replace(/[&<>"']/g, (char) => XML_ESCAPES[char] ?? char);
}

const seconds = (ms: number): string => (ms / 1_000).toFixed(3);

function scenarioMs(scenario: ScenarioView): number {
  return scenario.steps.reduce((total, step) => total + (step.result?.durationMs ?? 0), 0);
}

function testcase(scenario: ScenarioView): string {
  const open = `    <testcase classname="${xmlEscape(scenario.kind)}" name="${xmlEscape(scenario.title)}" time="${seconds(scenarioMs(scenario))}">`;
  const failed = scenario.steps.find((step) => step.state === 'failed');
  const healed = scenario.steps.filter((step) => step.result?.healing);
  const lines = [open];
  if (failed) {
    const steps = scenario.steps
      .slice(0, scenario.steps.indexOf(failed) + 1)
      .map((step, index) => `${index + 1}. ${describeStep(step)}`)
      .join('\n');
    lines.push(
      `      <failure message="${xmlEscape(failed.result?.error ?? 'Step failed')}" type="${xmlEscape(failed.action)}">${xmlEscape(steps)}</failure>`,
    );
  } else if (scenario.state === 'pending' || scenario.state === 'running') {
    lines.push('      <skipped message="The run ended before this scenario finished"/>');
  }
  if (healed.length > 0) {
    const notes = healed
      .map((step) => {
        const healing = step.result?.healing;
        return healing
          ? `Healed (needs review): ${Locator.describe(healing.from)} -> ${Locator.describe(healing.to)}. ${healing.reason}`
          : '';
      })
      .join('\n');
    lines.push(`      <system-out>${xmlEscape(notes)}</system-out>`);
  }
  lines.push('    </testcase>');
  return lines.join('\n');
}

function auditTestcase({ page, check }: AuditEntry): string {
  const name = xmlEscape(`${page}: ${check.name}`);
  const open = `    <testcase classname="${check.category}" name="${name}" time="0">`;
  if (check.status === 'passed') return `${open}</testcase>`;
  const detail = `Measured ${check.actual}, expected ${check.expected}`;
  const result =
    check.status === 'failed'
      ? `<failure message="${xmlEscape(detail)}" type="${check.category}"/>`
      : `<skipped message="${xmlEscape(check.actual)}"/>`;
  return `${open}
      ${result}
    </testcase>`;
}

/** The performance and security checks as their own suite, or nothing for older runs. */
function auditSuite(view: RunView): {
  xml: string[];
  tests: number;
  failures: number;
  skipped: number;
} {
  const entries = auditEntries(view);
  const failures = entries.filter(({ check }) => check.status === 'failed').length;
  const skipped = entries.filter(({ check }) => check.status === 'skipped').length;
  if (entries.length === 0) return { xml: [], tests: 0, failures: 0, skipped: 0 };
  const counts = `tests="${entries.length}" failures="${failures}" errors="0" skipped="${skipped}" time="0"`;
  return {
    xml: [
      `  <testsuite name="Performance and security" ${counts}>`,
      ...entries.map((entry) => auditTestcase(entry)),
      '  </testsuite>',
    ],
    tests: entries.length,
    failures,
    skipped,
  };
}

/** JUnit XML for CI: one test case per scenario, failures carry the steps to reproduce. */
export class JUnitExporter implements IReportExporter {
  readonly format = 'junit';

  export(view: RunView): ExportedReport {
    const tests = view.scenarios.length;
    const failures = view.scenarios.filter((s) => s.state === 'failed').length;
    const skipped = view.scenarios.filter(
      (s) => s.state === 'pending' || s.state === 'running',
    ).length;
    const time = seconds(view.durationMs ?? view.scenarios.reduce((t, s) => t + scenarioMs(s), 0));
    const name = xmlEscape(view.targetLabel ?? 'TestPilot run');
    const counts = `tests="${tests}" failures="${failures}" errors="0" skipped="${skipped}" time="${time}"`;
    const audits = auditSuite(view);
    const totals = `tests="${tests + audits.tests}" failures="${failures + audits.failures}" errors="0" skipped="${skipped + audits.skipped}" time="${time}"`;
    const properties = [
      ['targetUrl', view.targetUrl ?? ''],
      ['plan', view.replayed ? 'replayed' : 'live'],
      ['llmCalls', String(view.llmCallsUsed)],
    ]
      .map(
        ([key = '', value = '']) => `      <property name="${key}" value="${xmlEscape(value)}"/>`,
      )
      .join('\n');
    const body = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<testsuites name="TestPilot" ${totals}>`,
      `  <testsuite name="${name}" ${counts} timestamp="${xmlEscape(view.startedAt ?? '')}">`,
      `    <properties>\n${properties}\n    </properties>`,
      ...view.scenarios.map((scenario) => testcase(scenario)),
      '  </testsuite>',
      ...audits.xml,
      '</testsuites>',
      '',
    ].join('\n');
    return {
      fileName: reportFileName(view, 'xml'),
      contentType: 'application/xml; charset=utf-8',
      body,
    };
  }
}
