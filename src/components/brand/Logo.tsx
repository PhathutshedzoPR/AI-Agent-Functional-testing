import { cn } from '@/lib/cn';

type Props = Readonly<{ tone?: 'dark' | 'light'; className?: string }>;

/** Wordmark with a three-waypoint route as its mark. */
export function Logo({ tone = 'light', className }: Props) {
  const ink = tone === 'light' ? 'var(--color-ink)' : 'var(--color-text)';
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <svg viewBox="0 0 32 20" aria-hidden="true" className="h-5 w-8">
        <path
          d="M3 14 C10 14 12 5 18 5 S26 12 29 12"
          stroke={ink}
          strokeWidth="2"
          fill="none"
          opacity="0.5"
        />
        <circle cx="3" cy="14" r="2.6" fill="var(--color-passed)" />
        <circle cx="18" cy="5" r="2.6" fill="var(--color-signal)" stroke={ink} strokeWidth="1" />
        <circle cx="29" cy="12" r="2.6" fill="none" stroke={ink} strokeWidth="1.6" />
      </svg>
      <span className="font-serif text-2xl leading-none" style={{ color: ink }}>
        TestPilot
      </span>
    </span>
  );
}
