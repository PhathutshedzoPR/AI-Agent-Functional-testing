import Image from 'next/image';
import { runApiPaths } from '@/contracts';
import { describeStep, type Device, type StepView } from '@/core/domain';
import { cn } from '@/lib/cn';

type Props = Readonly<{ runId: string; step: StepView | null; device: Device }>;

// The shape of a screenshot, so the tile keeps its size before the image arrives.
const SCREEN = {
  desktop: { width: 1280, height: 800 },
  iphone: { width: 393, height: 659 },
  android: { width: 412, height: 839 },
} as const;

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
      {/* unoptimized: private per-run JPEGs from our own API, served as they are. */}
      <Image
        unoptimized
        loading="eager"
        src={runApiPaths.screenshot(runId, step.id)}
        alt={`Browser after: ${caption}`}
        width={screen.width}
        height={screen.height}
        // A phone screenshot is tall and narrow; centre it at a readable height instead of full width.
        className={cn(
          'rounded-xl border border-divider',
          phone ? 'mx-auto max-h-[36rem] w-auto' : 'w-full',
        )}
      />
      <figcaption className="text-sm text-muted">
        {caption}
        {step.result.url && <span className="ml-2 font-mono text-xs">{step.result.url}</span>}
      </figcaption>
    </figure>
  );
}
