import Image from 'next/image';
import { runApiPaths } from '@/contracts';
import { describeStep, type Device, type StepView } from '@/core/domain';
import { cn } from '@/lib/cn';
import { StatusBadge } from './StatusBadge';

type Props = Readonly<{ runId: string; step: StepView | null; device: Device }>;

// The shape of a screenshot, so the tile keeps its size before the image arrives.
const SCREEN = {
  desktop: { width: 1280, height: 800 },
  iphone: { width: 393, height: 659 },
  android: { width: 412, height: 839 },
} as const;

// Each status glows in its own colour (globals.css step-glow).
const GLOW: Readonly<Record<StepView['state'], string>> = {
  pending: '',
  running: '',
  passed: 'glow-passed',
  healed: 'glow-healed',
  failed: 'glow-failed',
  skipped: '',
};

/** The real screenshot taken after the selected (or latest) step. */
export function LiveBrowser({ runId, step, device }: Props) {
  const screen = SCREEN[device];
  const phone = device !== 'desktop';
  if (!step?.result?.screenshot) {
    return (
      <div className="grid aspect-[1280/800] place-items-center rounded-xl border border-divider bg-surface text-muted">
        {step ? 'No screenshot for this step yet.' : 'Screenshots appear here as each step runs.'}
      </div>
    );
  }
  const caption = describeStep(step);
  return (
    <figure className="space-y-2">
      {/* Keyed by step, so each new screenshot plays the glow once (CLAUDE.md s9: motion on events). */}
      {/* unoptimized: private per-run JPEGs from our own API, served as they are. */}
      <Image
        unoptimized
        loading="eager"
        src={runApiPaths.screenshot(runId, step.id)}
        alt={`Browser after: ${caption}`}
        width={screen.width}
        height={screen.height}
        // A phone screenshot is tall and narrow; centre it at a readable height instead of full width.
        key={step.id}
        className={cn(
          'step-glow rounded-xl border border-divider',
          GLOW[step.state],
          phone ? 'mx-auto max-h-[36rem] w-auto' : 'w-full',
        )}
      />
      <figcaption className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
        <StatusBadge state={step.state} />
        {caption}
        {step.result.url && <span className="ml-2 font-mono text-xs">{step.result.url}</span>}
      </figcaption>
    </figure>
  );
}
