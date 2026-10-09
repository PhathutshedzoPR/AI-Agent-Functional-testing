import { Download } from 'lucide-react';
import { runApiPaths } from '@/contracts';

const EXPORTS = [
  { format: 'junit', label: 'Download JUnit XML', note: 'For CI: one test case per scenario.' },
  { format: 'spec', label: 'Download Playwright test', note: 'Runs with npx playwright test.' },
  {
    format: 'markdown',
    label: 'Download Markdown report',
    note: 'One issue-ready section per bug.',
  },
  { format: 'json', label: 'Download JSON', note: 'Everything, for your own tools.' },
] as const;

/** The files a team keeps after a run. */
export function ExportMenu({ runId, ready }: Readonly<{ runId: string; ready: boolean }>) {
  if (!ready) {
    return <p className="text-muted">Exports are ready when the run finishes.</p>;
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {EXPORTS.map((item) => (
        <li key={item.format}>
          <a
            href={runApiPaths.export(runId, item.format)}
            download
            className="flex items-start gap-3 rounded-xl border border-divider bg-surface p-4 hover:border-signal focus-visible:outline-2 focus-visible:outline-signal"
          >
            <Download aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-signal" />
            <span>
              <span className="block font-semibold">{item.label}</span>
              <span className="text-sm text-muted">{item.note}</span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
