'use client';

import Link from 'next/link';
import { Mascot } from '@/components/brand/Mascot';
import { buttonStyles } from '@/components/ui';

type Props = Readonly<{ error: Error & { digest?: string }; reset: () => void }>;

/** Shown when a dashboard page fails to render. The details stay in the server log. */
export default function DashboardError({ reset }: Props) {
  return (
    <div role="alert" className="mx-auto flex max-w-2xl flex-col items-start gap-6 py-10">
      <Mascot mood="worried" className="size-24" />
      <h1 className="font-serif text-5xl">This page didn&apos;t load</h1>
      <p className="max-w-[60ch] text-lg text-muted">
        Something went wrong while showing it. Try again, and if it keeps happening, start a new
        run.
      </p>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={reset} className={buttonStyles()}>
          Try again
        </button>
        <Link href="/runs/new" className={buttonStyles({ tone: 'outline' })}>
          Start a new run
        </Link>
      </div>
    </div>
  );
}
