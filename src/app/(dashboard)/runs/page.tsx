import type { Metadata } from 'next';
import Link from 'next/link';
import { RUN_STATUS_LABELS } from '@/core/domain';
import { getContainer } from '@/server/container';

export const metadata: Metadata = { title: 'History' };
export const dynamic = 'force-dynamic';

const WHEN = new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium', timeStyle: 'short' });

export default async function HistoryPage() {
  const runs = await getContainer().runs.list();
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="font-serif text-5xl">History</h1>
      {runs.length === 0 ? (
        <p className="text-muted">
          No runs yet since the server started.{' '}
          <Link
            href="/runs/new"
            className="font-semibold text-signal underline-offset-4 hover:underline"
          >
            Start the first one
          </Link>
          .
        </p>
      ) : (
        <ul className="divide-y divide-divider rounded-[20px] border border-divider bg-raised">
          {runs.map((run) => (
            <li key={run.id}>
              <Link
                href={`/runs/${run.id}`}
                className="flex flex-wrap items-center gap-x-6 gap-y-1 p-4 hover:bg-surface focus-visible:outline-2 focus-visible:outline-signal"
              >
                <span className="font-semibold">{run.targetLabel}</span>
                <span>{RUN_STATUS_LABELS[run.status]}</span>
                <span className="text-sm text-muted">{WHEN.format(new Date(run.createdAt))}</span>
                {run.story && (
                  <span className="w-full truncate text-sm text-muted">{run.story}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
