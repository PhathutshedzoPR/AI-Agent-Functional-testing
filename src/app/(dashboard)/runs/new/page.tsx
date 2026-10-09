import type { Metadata } from 'next';
import { NewRunForm } from '@/components/runs/NewRunForm';
import { getContainer } from '@/server/container';

export const metadata: Metadata = { title: 'New run' };
// Reads server settings at request time, not at build time.
export const dynamic = 'force-dynamic';

export default function NewRunPage() {
  const { env } = getContainer();
  // Sites besides the demo shop that a run may target: any public site, or the allowlisted hosts.
  const ownHost = new URL(env.APP_BASE_URL).host;
  const customHosts =
    env.TARGET_MODE === 'public' ? 'any' : env.TARGET_ALLOWLIST.filter((host) => host !== ownHost);
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <h1 className="font-serif text-5xl">New run</h1>
      {env.LLM_PROVIDER === 'replay' && (
        <p className="rounded-xl border border-divider bg-raised p-4 text-sm text-muted">
          Replay mode: plans come from recorded Gemini responses, and the browser still runs every
          step for real. Each suggested story is recorded for every release; a story of your own
          needs a live model. After a run, try its plan on another release or a phone screen.
        </p>
      )}
      <NewRunForm appBaseUrl={env.APP_BASE_URL} customHosts={customHosts} />
    </div>
  );
}
