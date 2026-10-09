'use client';

import { buttonStyles } from '../ui';
import { SAMPLE_SITES, type SampleSite } from './sampleSites';
import type { CustomHosts } from './TargetPicker';

type Props = Readonly<{ customHosts: CustomHosts; onPick: (site: SampleSite) => void }>;

/** One tap to try a real public site this server allows: fills in its address and a story. */
export function SamplePicker({ customHosts, onPick }: Props) {
  const allowed = SAMPLE_SITES.filter(
    (site) => customHosts === 'any' || customHosts.includes(site.host),
  );
  if (allowed.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm text-muted">Or try a real site made for practice:</span>
      {allowed.map((site) => (
        <button
          key={site.url}
          type="button"
          onClick={() => onPick(site)}
          className={buttonStyles({ tone: 'outline', size: 'sm' })}
        >
          {site.name}
        </button>
      ))}
    </div>
  );
}
