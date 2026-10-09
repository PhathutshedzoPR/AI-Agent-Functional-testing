import { CheckCircle2, Circle, CircleDashed, Loader2, Wrench, XCircle } from 'lucide-react';
import { STEP_STATUS_LABELS, type StepState } from '@/core/domain';
import { cn } from '@/lib/cn';

const ICONS = {
  pending: Circle,
  running: Loader2,
  passed: CheckCircle2,
  healed: Wrench,
  failed: XCircle,
  skipped: CircleDashed,
} as const;

const TONES: Readonly<Record<StepState, string>> = {
  pending: 'text-muted',
  running: 'text-signal',
  passed: 'text-passed',
  healed: 'text-healed',
  failed: 'text-failed',
  skipped: 'text-skipped',
};

type Props = Readonly<{ state: StepState; className?: string }>;

/** A status as icon plus word, never colour alone (CLAUDE.md section 9). */
export function StatusBadge({ state, className }: Props) {
  const Icon = ICONS[state];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-sm font-semibold',
        TONES[state],
        className,
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn('size-4', state === 'running' && 'motion-safe:animate-spin')}
      />
      {STEP_STATUS_LABELS[state]}
    </span>
  );
}
