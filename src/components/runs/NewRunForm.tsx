'use client';

import { useRouter } from 'next/navigation';
import { useState, type SubmitEvent } from 'react';
import { RELEASES, shopPath } from '@/app/demo-shop/_config/releases';
import { RunResponseSchema, runApiPaths, type StartRunRequest } from '@/contracts';
import type { Device } from '@/core/domain';
import { ApiRequestError, sendJson } from '@/lib/sendJson';
import { buttonStyles } from '../ui';
import { DevicePicker } from './DevicePicker';
import { SamplePicker } from './SamplePicker';
import type { SampleSite } from './sampleSites';
import { StoryComposer } from './StoryComposer';
import { TargetPicker, type CustomHosts, type TargetChoice } from './TargetPicker';

type Props = Readonly<{ appBaseUrl: string; customHosts: CustomHosts }>;

type Choices = Readonly<{
  target: TargetChoice;
  customUrl: string;
  story: string;
  device: Device;
}>;

function requestFor(choices: Choices, appBaseUrl: string): StartRunRequest {
  const { target, device } = choices;
  const story = choices.story.trim() || null;
  if (target === 'custom') return { targetUrl: choices.customUrl.trim(), story, device };
  return {
    targetUrl: new URL(shopPath(target), appBaseUrl).href,
    targetLabel: `Kota Express (${RELEASES[target].name.toLowerCase()})`,
    story,
    device,
  };
}

/** Choose a target, say what to test, start the run. */
export function NewRunForm({ appBaseUrl, customHosts }: Props) {
  const router = useRouter();
  const [target, setTarget] = useState<TargetChoice>('stable');
  const [customUrl, setCustomUrl] = useState('');
  const [story, setStory] = useState('');
  const [device, setDevice] = useState<Device>('desktop');
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const pickSample = (site: SampleSite): void => {
    setTarget('custom');
    setCustomUrl(site.url);
    setStory(site.story);
  };

  const submit = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setStarting(true);
    setError(null);
    try {
      const body = requestFor({ target, customUrl, story, device }, appBaseUrl);
      const { run } = await sendJson(runApiPaths.runs, body, RunResponseSchema);
      router.push(`/runs/${run.id}`);
    } catch (caught) {
      setError(caught instanceof ApiRequestError ? caught.message : 'Could not start the run.');
      setStarting(false);
    }
  };

  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-8">
      <TargetPicker
        value={target}
        onChange={setTarget}
        customUrl={customUrl}
        onCustomUrlChange={setCustomUrl}
        customHosts={customHosts}
      />
      <SamplePicker customHosts={customHosts} onPick={pickSample} />
      <DevicePicker value={device} onChange={setDevice} />
      <StoryComposer story={story} onChange={setStory} />
      {error && (
        <p role="alert" className="rounded-xl border border-failed p-3 text-sm">
          {error}
        </p>
      )}
      <button type="submit" disabled={starting} className={buttonStyles()}>
        {starting ? 'Starting run...' : 'Start run'}
      </button>
    </form>
  );
}
