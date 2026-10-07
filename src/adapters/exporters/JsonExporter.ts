import type { RunView } from '@/core/domain';
import type { ExportedReport, IReportExporter } from '@/core/ports';
import { reportFileName } from './reportFileName';

/** The whole run view as JSON, for tools and archives. The agent feed is left out. */
export class JsonExporter implements IReportExporter {
  readonly format = 'json';

  export(view: RunView): ExportedReport {
    // The feed and live-cursor fields only matter on screen; the report keeps the facts.
    const report = {
      generator: 'TestPilot',
      runId: view.runId,
      status: view.status,
      targetUrl: view.targetUrl,
      targetLabel: view.targetLabel,
      story: view.story,
      replayed: view.replayed,
      device: view.device,
      startedAt: view.startedAt,
      finishedAt: view.finishedAt,
      durationMs: view.durationMs,
      llmCallsUsed: view.llmCallsUsed,
      summary: view.summary,
      criteria: view.criteria,
      criteriaInferred: view.criteriaInferred,
      warnings: view.warnings,
      stats: view.stats,
      scenarios: view.scenarios,
      bugs: view.bugs,
      findings: view.findings,
      pages: view.pages,
    };
    return {
      fileName: reportFileName(view, 'json'),
      contentType: 'application/json; charset=utf-8',
      body: `${JSON.stringify(report, null, 2)}\n`,
    };
  }
}
