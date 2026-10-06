import { cn } from '@/lib/cn';

type Mood = 'idle' | 'flying' | 'worried';

type Props = Readonly<{ mood?: Mood; className?: string; label?: string }>;

const MOUTHS: Readonly<Record<Mood, string>> = {
  idle: 'M44 70 Q50 75 56 70',
  flying: 'M42 68 Q50 78 58 68',
  worried: 'M43 73 Q50 67 57 73',
};

/** Our own geometric pilot bot: a round body, pilot goggles and a scarf. */
export function Mascot({
  mood = 'idle',
  className,
  label = 'TestPilot, a small round robot in pilot goggles',
}: Props) {
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label={label} className={cn('size-28', className)}>
      {mood === 'flying' && (
        <path
          d="M6 58 H22 M2 66 H18 M8 74 H22"
          stroke="var(--color-forest)"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.5"
        />
      )}
      <rect x="47" y="8" width="6" height="12" rx="3" fill="var(--color-forest)" />
      <circle
        cx="50"
        cy="8"
        r="5"
        fill="var(--color-signal)"
        stroke="var(--color-forest)"
        strokeWidth="2"
      />
      <circle
        cx="50"
        cy="56"
        r="34"
        fill="var(--color-sky)"
        stroke="var(--color-forest)"
        strokeWidth="3"
      />
      <rect x="22" y="38" width="56" height="10" rx="5" fill="var(--color-forest)" />
      <circle
        cx="38"
        cy="47"
        r="11"
        fill="var(--color-paper)"
        stroke="var(--color-forest)"
        strokeWidth="3"
      />
      <circle
        cx="62"
        cy="47"
        r="11"
        fill="var(--color-paper)"
        stroke="var(--color-forest)"
        strokeWidth="3"
      />
      <circle
        cx={mood === 'worried' ? 36 : 39}
        cy={mood === 'worried' ? 50 : 48}
        r="3.5"
        fill="var(--color-ink)"
      />
      <circle
        cx={mood === 'worried' ? 60 : 63}
        cy={mood === 'worried' ? 50 : 48}
        r="3.5"
        fill="var(--color-ink)"
      />
      <path
        d={MOUTHS[mood]}
        stroke="var(--color-ink)"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M30 80 Q50 92 70 80 L74 88 Q50 100 26 88 Z"
        fill="var(--color-signal)"
        stroke="var(--color-forest)"
        strokeWidth="2.5"
      />
    </svg>
  );
}
