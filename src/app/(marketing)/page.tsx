import Link from 'next/link';
import { z } from 'zod';
import { RELEASE_IDS, RELEASES, shopPath } from '@/app/demo-shop/_config/releases';
import { Logo } from '@/components/brand/Logo';
import { Mascot } from '@/components/brand/Mascot';
import { FlightPath } from '@/components/runs/FlightPath';
import { RunEventSchema, projectRun } from '@/core/domain';
import sample from './_data/sample-run.json';

const SampleSchema = z.object({
  recordedAt: z.iso.datetime(),
  recordedOn: z.string(),
  note: z.string().optional(),
  model: z.string(),
  events: z.array(RunEventSchema),
});

const STAGES = [
  {
    title: 'Receives',
    body: 'A web address and, if you like, a user story with acceptance criteria.',
  },
  {
    title: 'Decides',
    body: 'Reads every page the way a screen reader does, then plans happy-path, negative and edge-case scenarios.',
  },
  {
    title: 'Executes',
    body: 'Runs each step in real Chromium with Playwright, screenshots it, and finds renamed buttons again instead of giving up.',
  },
  {
    title: 'Delivers',
    body: 'A live dashboard, bug reports with steps to reproduce, JUnit XML for CI, and a Playwright test your team can keep.',
  },
] as const;

const REAL = [
  'Every pass or fail comes from a Playwright check on the real page. The language model plans; it never decides a verdict.',
  'Every screenshot is a capture of the browser at that step, and every duration is measured.',
  'A step that only passed because TestPilot found a renamed control is marked for review, not counted as clean.',
  'Replayed runs reuse a recorded plan, are labelled as replayed, and still drive the browser for real.',
] as const;

const WHEN = new Intl.DateTimeFormat('en-ZA', { dateStyle: 'long', timeStyle: 'short' });

export default function LandingPage() {
  const recorded = SampleSchema.parse(sample);
  const view = projectRun(recorded.events);
  const steps = view.scenarios.flatMap((scenario) => scenario.steps).length;

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-6">
        <Logo />
        <nav aria-label="Main" className="flex items-center gap-4 text-sm font-semibold sm:gap-6">
          <a
            href="#how"
            className="hidden min-h-11 items-center hover:underline focus-visible:outline-2 focus-visible:outline-forest sm:inline-flex"
          >
            How it works
          </a>
          <Link
            href="/runs"
            className="hidden min-h-11 items-center hover:underline focus-visible:outline-2 focus-visible:outline-forest sm:inline-flex"
          >
            History
          </Link>
          <Link
            href="/runs/new"
            className="inline-flex min-h-11 items-center rounded-full bg-forest px-4 whitespace-nowrap text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
          >
            Open the dashboard
          </Link>
        </nav>
      </header>

      <main>
        <section className="relative isolate overflow-hidden">
          <div
            aria-hidden="true"
            className="hero-aurora absolute inset-0 -z-10 [mask-image:linear-gradient(to_bottom,black_60%,transparent)]"
          />
          {/* minmax(0, ...) stops the wide flight path from stretching the column past the screen. */}
          <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] items-center gap-10 px-4 pt-10 pb-20 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <div className="space-y-6">
              <h1 className="font-serif text-5xl leading-[1.05] sm:text-7xl">
                A test pilot for your checkout.
              </h1>
              <p className="max-w-[60ch] text-lg">
                TestPilot reads your site, plans the tests a QA analyst would write, runs every step
                in a real browser and shows you what broke, with screenshots and steps to reproduce.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/runs/new"
                  className="rounded-full bg-signal px-6 py-3 font-semibold text-ink shadow-sm hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
                >
                  Run a test
                </Link>
                <a
                  href="#sample"
                  className="rounded-full border-2 border-forest px-6 py-3 font-semibold text-forest hover:bg-forest hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
                >
                  See a sample run
                </a>
              </div>
            </div>
            <figure
              id="sample"
              className="space-y-4 rounded-[20px] border border-ink/10 bg-paper/80 p-6 shadow-sm backdrop-blur"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold">{view.targetLabel}</p>
                  <p className="text-sm text-ink/70">
                    {view.stats.passed} of {steps} steps passed in{' '}
                    {Math.round((view.durationMs ?? 0) / 1_000)} seconds
                  </p>
                </div>
                <Mascot mood="flying" className="size-20" />
              </div>
              <FlightPath scenarios={view.scenarios} animate tone="light" />
              <figcaption className="text-sm text-ink/70">
                A real run, replayed from its recorded events:{' '}
                {WHEN.format(new Date(recorded.recordedAt))}, on {recorded.recordedOn}, planned by{' '}
                {recorded.model}.
              </figcaption>
            </figure>
          </div>
        </section>

        <section id="how" aria-labelledby="how-heading" className="mx-auto max-w-6xl px-4 py-16">
          <h2 id="how-heading" className="font-serif text-4xl sm:text-5xl">
            How it works
          </h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STAGES.map((stage, index) => (
              <li key={stage.title} className="rounded-[20px] border border-ink/10 bg-paper p-6">
                <p className="font-serif text-4xl text-forest">{index + 1}</p>
                <h3 className="mt-2 text-lg font-bold">{stage.title}</h3>
                <p className="mt-2 text-ink/80">{stage.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="real-heading" className="bg-forest text-paper">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 lg:grid-cols-[1fr_1.4fr]">
            <h2 id="real-heading" className="font-serif text-4xl sm:text-5xl">
              The AI proposes. Playwright decides.
            </h2>
            <ul className="space-y-4 text-lg">
              {REAL.map((line) => (
                <li key={line} className="border-l-2 border-signal pl-4">
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="kota-heading" className="mx-auto max-w-6xl px-4 py-16">
          <h2 id="kota-heading" className="font-serif text-4xl sm:text-5xl">
            Try it on Kota Express
          </h2>
          <p className="mt-3 max-w-[65ch] text-lg text-ink/80">
            A small kota shop that ships with TestPilot in three releases, so you can see a clean
            run, a run that heals renamed buttons, and a run that catches real bugs.
          </p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-3">
            {RELEASE_IDS.map((id) => (
              <li key={id} className="rounded-[20px] border border-ink/10 p-6">
                <h3 className="text-lg font-bold">{RELEASES[id].name}</h3>
                <p className="mt-1 text-ink/80">{RELEASES[id].summary}</p>
                <Link
                  href={shopPath(id)}
                  className="mt-4 inline-block font-semibold text-forest underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-forest"
                >
                  Open the {RELEASES[id].name.toLowerCase()} shop
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t border-ink/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-ink/70">
          <Logo />
          <p>Built for the Sebaka Testing AI Hackathon 2026, functional testing track.</p>
        </div>
      </footer>
    </div>
  );
}
