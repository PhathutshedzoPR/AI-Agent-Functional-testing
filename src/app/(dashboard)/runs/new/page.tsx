import type { Metadata } from 'next';
import { NewRunForm } from '@/components/runs/NewRunForm';
import { getContainer } from '@/server/container';

export const metadata: Metadata = { title: 'New run' };
// Reads server settings at request time, not at build time.
export const dynamic = 'force-dynamic';

export default function NewRunPage() {
  const { env } = getContainer();
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <h1 className="font-serif text-5xl">New run</h1>
      {env.LLM_PROVIDER === 'replay' && (
        <p className="rounded-xl border border-divider bg-raised p-4 text-sm text-muted">
          Replay mode: plans come from recorded Gemini responses, and the browser still runs every
          step for real. The suggested stories are recorded for Stable and Buggy. To see healing,
          run a story on Stable, then choose Run this plan on Redesign. Any finished run can also be
          re-run on a phone screen.
        </p>
      )}
      <NewRunForm appBaseUrl={env.APP_BASE_URL} allowCustomTargets={env.TARGET_MODE === 'public'} />
    </div>
  );
}
