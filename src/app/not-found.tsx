import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { Mascot } from '@/components/brand/Mascot';
import { buttonStyles } from '@/components/ui';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-paper px-4 py-6 text-ink">
      <div className="mx-auto max-w-6xl">
        <header>
          <Link href="/" aria-label="TestPilot home" className="inline-block">
            <Logo />
          </Link>
        </header>
        <main className="flex max-w-2xl flex-col items-start gap-6 py-16">
          <Mascot mood="worried" className="size-24" />
          <h1 className="font-serif text-5xl sm:text-6xl">There&apos;s no page here</h1>
          <p className="max-w-[60ch] text-lg text-ink/80">
            The address may be mistyped, or the page has moved. Head back to the start, or run a
            test.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/" className={buttonStyles({ tone: 'forest', surface: 'light' })}>
              Go to the start page
            </Link>
            <Link href="/runs/new" className={buttonStyles({ tone: 'outline', surface: 'light' })}>
              Run a test
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
