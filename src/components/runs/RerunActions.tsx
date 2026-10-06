'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { RELEASE_IDS, RELEASES, shopPath } from '@/app/demo-shop/_config/releases';
import { RunResponseSchema, runApiPaths } from '@/contracts';
import { ApiRequestError, sendJson } from '@/lib/sendJson';

type Props = Readonly<{ runId: string; appBaseUrl: string; currentUrl: string | null }>;

/**
 * Runs this run's plan, unchanged, against another Kota Express release: how a saved suite meets
 * a redesign, and where self-healing earns its keep.
 */
export function RerunActions({ runId, appBaseUrl, currentUrl }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const others = RELEASE_IDS.filter((id) => new URL(shopPath(id), appBaseUrl).href !== currentUrl);

  const rerun = async (release: (typeof RELEASE_IDS)[number]): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const { run } = await sendJson(
        runApiPaths.runs,
        {
          targetUrl: new URL(shopPath(release), appBaseUrl).href,
          targetLabel: `Kota Express (${RELEASES[release].name.toLowerCase()}), saved plan`,
          reusePlanFrom: runId,
        },
        RunResponseSchema,
      );
      router.push(`/runs/${run.id}`);
    } catch (caught) {
      setError(caught instanceof ApiRequestError ? caught.message : 'Could not start the run.');
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted">Run this plan on</span>
      {others.map((release) => (
        <button
          key={release}
          type="button"
          disabled={busy}
          onClick={() => void rerun(release)}
          className="rounded-full border border-control px-3 py-1 text-sm hover:border-signal focus-visible:outline-2 focus-visible:outline-signal disabled:opacity-60"
        >
          {RELEASES[release].name}
        </button>
      ))}
      {error && (
        <p role="alert" className="w-full text-sm text-failed">
          {error}
        </p>
      )}
    </div>
  );
}
