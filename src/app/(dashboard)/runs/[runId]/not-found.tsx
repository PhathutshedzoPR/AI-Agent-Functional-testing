import Link from 'next/link';
import { Mascot } from '@/components/brand/Mascot';
import { buttonStyles } from '@/components/ui';

/** A run link that no longer leads anywhere, usually because the server restarted. */
export default function RunNotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-start gap-6 py-10">
      <Mascot mood="worried" className="size-24" />
      <h1 className="font-serif text-5xl">This run isn&apos;t here</h1>
      <p className="max-w-[60ch] text-lg text-muted">
        TestPilot keeps runs in memory, so they are gone once the server restarts. Start a new run;
        it only takes a few seconds.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href="/runs/new" className={buttonStyles()}>
          Start a new run
        </Link>
        <Link href="/runs" className={buttonStyles({ tone: 'outline' })}>
          See the runs that are here
        </Link>
      </div>
    </div>
  );
}
