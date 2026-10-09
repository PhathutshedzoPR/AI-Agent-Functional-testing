import { STEP_STATUS_LABELS, describeStep, type StepView } from '@/core/domain';
import { cn } from '@/lib/cn';

type Props = Readonly<{
  step: StepView;
  index: number;
  total: number;
  selected: boolean;
  /** Seconds to wait before lighting up, for the one orchestrated landing animation. */
  revealDelay?: number;
  onSelect?: (stepId: string) => void;
}>;

const DOT: Readonly<Record<StepView['state'], string>> = {
  pending: 'border-2 border-control bg-transparent',
  running: 'bg-signal ring-4 ring-signal/30 motion-safe:animate-pulse',
  passed: 'bg-passed',
  healed: 'bg-healed',
  failed: 'bg-failed',
  skipped: 'border-2 border-skipped bg-transparent',
};

/**
 * One step on the flight path: a solid dot when it passed, a small detour loop above it when it
 * healed, a break in the line when it failed, a hollow dot when it was skipped.
 */
export function Waypoint({ step, index, total, selected, revealDelay, onSelect }: Props) {
  const label = `Step ${index + 1} of ${total}, ${describeStep(step)}, ${STEP_STATUS_LABELS[step.state].toLowerCase()}`;
  const marker = (
    <span className="relative flex size-6 items-center justify-center">
      {step.state === 'healed' && (
        <span
          aria-hidden="true"
          className="absolute -top-3 h-4 w-6 rounded-t-full border-2 border-b-0 border-healed"
        />
      )}
      <span
        aria-hidden="true"
        className={cn(
          'block size-3.5 rounded-full',
          DOT[step.state],
          revealDelay !== undefined && 'waypoint-reveal',
        )}
        style={revealDelay === undefined ? undefined : { animationDelay: `${revealDelay}s` }}
      />
      {step.state === 'failed' && (
        <span aria-hidden="true" className="absolute -right-1.5 h-4 w-1 rotate-12 bg-surface" />
      )}
    </span>
  );

  if (!onSelect) {
    return (
      <span role="img" aria-label={label} title={label}>
        {marker}
      </span>
    );
  }
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={selected}
      onClick={() => onSelect(step.id)}
      className={cn(
        // 32px for a mouse, 44px on a touch screen so a finger can hit one waypoint.
        'rounded-full p-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal pointer-coarse:p-2.5',
        selected && 'bg-raised ring-2 ring-signal',
      )}
    >
      {marker}
    </button>
  );
}
