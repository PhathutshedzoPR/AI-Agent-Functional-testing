'use client';

import Image from 'next/image';
import { useState } from 'react';
import { runApiPaths } from '@/contracts';
import type { RunView } from '@/core/domain';
import { cn } from '@/lib/cn';
import { buttonStyles } from '../ui';

type Props = Readonly<{ runId: string; pages: RunView['pages'] }>;

const pathOf = (url: string): string => {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
};

/** A quick scan has no steps, so its browser tile shows the page screenshots it took instead. */
export function ScanScreens({ runId, pages }: Props) {
  const shots = pages.flatMap((page) =>
    page.screenshotId ? [{ id: page.screenshotId, path: pathOf(page.url), title: page.title }] : [],
  );
  const [chosen, setChosen] = useState<string | null>(null);
  // Follow the newest page while the scan runs, until someone picks one.
  const shown = shots.find((shot) => shot.id === chosen) ?? shots.at(-1);
  if (!shown) {
    return (
      <div className="grid aspect-[1280/800] place-items-center rounded-xl border border-divider bg-surface text-muted">
        A screenshot of each page appears here as the scan reads it.
      </div>
    );
  }
  return (
    <figure className="space-y-3">
      {/* unoptimized: private per-run JPEGs from our own API, served as they are. */}
      <Image
        unoptimized
        loading="eager"
        src={runApiPaths.screenshot(runId, shown.id)}
        alt={`Page ${shown.path} as the scan saw it`}
        width={1280}
        height={800}
        className="w-full rounded-xl border border-divider"
      />
      <figcaption className="text-sm text-muted">
        <span className="font-mono text-xs">{shown.path}</span> {shown.title}
      </figcaption>
      {shots.length > 1 && (
        <div className="flex flex-wrap gap-2" aria-label="Scanned pages">
          {shots.map((shot) => (
            <button
              key={shot.id}
              type="button"
              aria-pressed={shot.id === shown.id}
              onClick={() => setChosen(shot.id)}
              className={cn(
                buttonStyles({ tone: 'outline', size: 'sm' }),
                'font-mono',
                shot.id === shown.id && 'border-signal',
              )}
            >
              {shot.path}
            </button>
          ))}
        </div>
      )}
    </figure>
  );
}
