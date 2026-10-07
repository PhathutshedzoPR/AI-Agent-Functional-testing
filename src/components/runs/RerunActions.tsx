'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { RELEASE_IDS, RELEASES, shopPath, type ReleaseId } from '@/app/demo-shop/_config/releases';
import { RunResponseSchema, runApiPaths } from '@/contracts';
import { DEVICE_LABELS, DEVICES, type Device } from '@/core/domain';
import { ApiRequestError, sendJson } from '@/lib/sendJson';
import { buttonStyles } from '../ui';

type Props = Readonly<{
  runId: string;
  appBaseUrl: string;
  currentUrl: string | null;
  device: Device;
}>;

const button = buttonStyles({ tone: 'outline', size: 'sm' });

/**
 * Runs this run's plan, unchanged, on another Kota Express release or another screen: how a saved
 * suite meets a redesign or a phone, and where self-healing earns its keep.
 */
export function RerunActions({ runId, appBaseUrl, currentUrl, device }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const urlOf = (release: ReleaseId): string => new URL(shopPath(release), appBaseUrl).href;
  const current = RELEASE_IDS.find((release) => urlOf(release) === currentUrl) ?? null;

  const rerun = async (release: ReleaseId, onDevice: Device): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const { run } = await sendJson(
        runApiPaths.runs,
        {
          targetUrl: urlOf(release),
          targetLabel: `Kota Express (${RELEASES[release].name.toLowerCase()}), saved plan`,
          reusePlanFrom: runId,
          device: onDevice,
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
    <div className="space-y-3 print:hidden">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted">Run this plan on</span>
        {RELEASE_IDS.filter((release) => release !== current).map((release) => (
          <button
            key={release}
            type="button"
            disabled={busy}
            onClick={() => void rerun(release, device)}
            className={button}
          >
            {RELEASES[release].name}
          </button>
        ))}
      </div>
      {current && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted">Or on another screen</span>
          {DEVICES.filter((other) => other !== device).map((other) => (
            <button
              key={other}
              type="button"
              disabled={busy}
              onClick={() => void rerun(current, other)}
              className={button}
            >
              {DEVICE_LABELS[other]}
            </button>
          ))}
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-failed">
          {error}
        </p>
      )}
    </div>
  );
}
