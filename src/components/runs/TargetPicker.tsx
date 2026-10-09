'use client';

import { RELEASE_IDS, RELEASES, type ReleaseId } from '@/app/demo-shop/_config/releases';
import { cn } from '@/lib/cn';

export type TargetChoice = ReleaseId | 'custom';

/** Sites besides the demo shop a run may target: any public site, or these hosts only. */
export type CustomHosts = 'any' | readonly string[];

type Props = Readonly<{
  value: TargetChoice;
  onChange: (value: TargetChoice) => void;
  customUrl: string;
  onCustomUrlChange: (value: string) => void;
  customHosts: CustomHosts;
}>;

const cardClass =
  'flex cursor-pointer flex-col gap-1 rounded-xl border border-divider bg-raised p-4 has-checked:border-signal has-focus-visible:outline-2 has-focus-visible:outline-signal';

function customHostsHint(hosts: CustomHosts): string {
  if (hosts === 'any') return 'Any public site. Private and local addresses are refused.';
  if (hosts.length > 0) return `This server allows ${hosts.join(', ')}.`;
  return 'Off in this setup: the server only allows the demo shop (TARGET_MODE=allowlist).';
}

/** Step one of a new run: Kota Express releases, plus your own URL when public mode allows it. */
export function TargetPicker({
  value,
  onChange,
  customUrl,
  onCustomUrlChange,
  customHosts,
}: Props) {
  const allowCustom = customHosts === 'any' || customHosts.length > 0;
  return (
    <fieldset className="grid gap-3 sm:grid-cols-2">
      <legend className="mb-3 text-lg font-semibold">Choose a target</legend>
      {RELEASE_IDS.map((id) => (
        <label key={id} className={cardClass}>
          <span className="flex items-center gap-2 font-semibold">
            <input
              type="radio"
              name="target"
              value={id}
              checked={value === id}
              onChange={() => onChange(id)}
              className="accent-signal"
            />
            Kota Express ({RELEASES[id].name.toLowerCase()})
          </span>
          <span className="text-sm text-muted">{RELEASES[id].summary}</span>
        </label>
      ))}
      <label className={cn(cardClass, !allowCustom && 'cursor-not-allowed opacity-70')}>
        <span className="flex items-center gap-2 font-semibold">
          <input
            type="radio"
            name="target"
            value="custom"
            checked={value === 'custom'}
            onChange={() => onChange('custom')}
            disabled={!allowCustom}
            className="accent-signal"
          />
          Your own URL
        </span>
        <span className="text-sm text-muted">{customHostsHint(customHosts)}</span>
        {value === 'custom' && (
          <input
            type="url"
            aria-label="Site address"
            placeholder={
              customHosts === 'any' ? 'https://example.com' : `https://${customHosts[0] ?? ''}/`
            }
            value={customUrl}
            onChange={(event) => onCustomUrlChange(event.target.value)}
            className="mt-2 rounded-lg border border-control bg-surface px-3 py-2 font-mono text-sm"
          />
        )}
      </label>
    </fieldset>
  );
}
