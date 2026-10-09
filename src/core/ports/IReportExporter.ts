import type { ExportFormat, RunView } from '../domain';

export type ExportedReport = Readonly<{ fileName: string; contentType: string; body: string }>;

/** Turns a finished run into a file a team keeps: JSON, JUnit XML, Markdown or a spec (Strategy). */
export interface IReportExporter {
  readonly format: ExportFormat;
  export(view: RunView): ExportedReport;
}
