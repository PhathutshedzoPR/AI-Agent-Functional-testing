import Image from 'next/image';
import type { BugReport } from '@/core/domain';
import { runApiPaths } from '@/contracts';

type Props = Readonly<{ runId: string; bug: BugReport }>;

/** One bug: steps to reproduce, expected against actual, and the screenshot as evidence. */
export function BugCard({ runId, bug }: Props) {
  return (
    <article className="space-y-3 rounded-xl border border-divider bg-surface p-4">
      <header className="flex flex-wrap items-baseline gap-3">
        <h3 className="font-semibold">{bug.title}</h3>
        <span className="text-sm text-muted">Severity: {bug.severity}</span>
      </header>
      <div>
        <h4 className="text-sm font-semibold text-muted">Steps to reproduce</h4>
        <ol className="ml-5 list-decimal text-sm">
          {bug.stepsToReproduce.map((step, index) => (
            <li key={`${index}-${step}`}>{step}</li>
          ))}
        </ol>
      </div>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-semibold text-muted">Expected</dt>
          <dd>{bug.expected}</dd>
        </div>
        <div>
          <dt className="font-semibold text-muted">Actual</dt>
          <dd>{bug.actual}</dd>
        </div>
      </dl>
      {bug.screenshotStepId && (
        <Image
          unoptimized
          src={runApiPaths.screenshot(runId, bug.screenshotStepId)}
          alt={`Screenshot when the bug happened: ${bug.actual}`}
          width={1280}
          height={800}
          className="w-full max-w-xl rounded-lg border border-divider"
        />
      )}
    </article>
  );
}
