import type { FeedItem } from '@/core/domain';
import { cn } from '@/lib/cn';

const TONES = {
  info: 'text-text',
  good: 'text-passed',
  warn: 'text-healed',
  bad: 'text-failed',
} as const;

/** The agent's own voice, in the italic serif reserved for it. Polite live region for readers. */
export function AgentFeed({ items }: Readonly<{ items: readonly FeedItem[] }>) {
  return (
    <section
      aria-labelledby="feed-heading"
      className="rounded-[20px] border border-divider bg-raised p-5"
    >
      <h2 id="feed-heading" className="mb-3 font-semibold">
        Agent feed
      </h2>
      <ol aria-live="polite" className="max-h-80 space-y-2 overflow-y-auto">
        {items.length === 0 && <li className="text-muted">Waiting for take-off.</li>}
        {items.map((item) => (
          <li
            key={item.seq}
            className={cn('font-serif text-lg italic leading-snug', TONES[item.tone])}
          >
            {item.text}
          </li>
        ))}
      </ol>
    </section>
  );
}
