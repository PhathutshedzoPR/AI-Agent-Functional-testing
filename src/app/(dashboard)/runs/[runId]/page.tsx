import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { RunDashboard } from '@/components/runs/RunDashboard';
import { RunParamsSchema } from '@/contracts';
import { getContainer } from '@/server/container';

export const metadata: Metadata = { title: 'Run' };
export const dynamic = 'force-dynamic';

export default async function RunPage({ params }: Readonly<PageProps<'/runs/[runId]'>>) {
  const parsed = RunParamsSchema.safeParse(await params);
  if (!parsed.success) notFound();
  const { env } = getContainer();
  return <RunDashboard runId={parsed.data.runId} appBaseUrl={env.APP_BASE_URL} />;
}
