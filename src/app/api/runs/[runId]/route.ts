import { RunParamsSchema, type RunSnapshotResponse } from '@/contracts';
import { withApiHandler } from '@/server/api';

export const GET = withApiHandler({ params: RunParamsSchema }, async ({ params, container }) => {
  const { run, events } = await container.runs.get(params.runId);
  return Response.json({ run, events: [...events] } satisfies RunSnapshotResponse);
});
