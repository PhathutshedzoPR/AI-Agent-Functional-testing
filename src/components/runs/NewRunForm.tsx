'use client';

import { useRouter } from 'next/navigation';
import { useState, type SubmitEvent } from 'react';
import { RELEASES, shopPath } from '@/app/demo-shop/_config/releases';
import { RunResponseSchema, runApiPaths, type StartRunRequest } from '@/contracts';
import { ApiRequestError, sendJson } from '@/lib/sendJson';
import { StoryComposer } from './StoryComposer';
import { TargetPicker, type TargetChoice } from './TargetPicker';

type Props = Readonly<{ appBaseUrl: string; allowCustomTargets: boolean }>;

function requestFor(
  target: TargetChoice,
  customUrl: string,
  appBaseUrl: string,
  story: string,
): StartRunRequest {
  const trimmedStory = story.trim() || null;
  if (target === 'custom') return { targetUrl: customUrl.trim(), story: trimmedStory };
  return {
    targetUrl: new URL(shopPath(target), appBaseUrl).href,
    targetLabel: `Kota Express (${RELEASES[target].name.toLowerCase()})`,
    story: trimmedStory,
  };
}

/** Choose a target, say what to test, start the run. */
export function NewRunForm({ appBaseUrl, allowCustomTargets }: Props) {
  const router = useRouter();
  const [target, setTarget] = useState<TargetChoice>('stable');
  const [customUrl, setCustomUrl] = useState('');
  const [story, setStory] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const submit = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setStarting(true);
    setError(null);
    try {
      const body = requestFor(target, customUrl, appBaseUrl, story);
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
        allowCustom={allowCustomTargets}
      />
      <StoryComposer story={story} onChange={setStory} />
      {error && (
        <p role="alert" className="rounded-xl border border-failed p-3 text-sm">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={starting}
        className="rounded-full bg-signal px-6 py-3 font-semibold text-ink hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal disabled:opacity-60"
      >
        {starting ? 'Starting run...' : 'Start run'}
      </button>
    </form>
  );
}
