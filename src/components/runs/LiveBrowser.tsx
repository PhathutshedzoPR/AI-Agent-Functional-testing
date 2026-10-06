import Image from 'next/image';
import { runApiPaths } from '@/contracts';
import { describeStep, type StepView } from '@/core/domain';

type Props = Readonly<{ runId: string; step: StepView | null }>;

/** The real screenshot taken after the selected (or latest) step. */
export function LiveBrowser({ runId, step }: Props) {
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
        src={runApiPaths.screenshot(runId, step.id)}
        alt={`Browser after: ${caption}`}
        width={1280}
        height={800}
        className="w-full rounded-xl border border-divider"
      />
      <figcaption className="text-sm text-muted">
        {caption}
        {step.result.url && <span className="ml-2 font-mono text-xs">{step.result.url}</span>}
      </figcaption>
    </figure>
  );
}
