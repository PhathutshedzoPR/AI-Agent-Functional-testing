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
      <NewRunForm appBaseUrl={env.APP_BASE_URL} allowCustomTargets={env.TARGET_MODE === 'public'} />
    </div>
  );
}
