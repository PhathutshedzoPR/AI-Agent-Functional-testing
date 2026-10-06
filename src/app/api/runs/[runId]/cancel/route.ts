import { RunParamsSchema, type RunResponse } from '@/contracts';
import { withApiHandler } from '@/server/api';

export const POST = withApiHandler(
  { params: RunParamsSchema, sameOrigin: true },
  async ({ params, container }) => {
    const run = await container.runs.cancel(params.runId);
    return Response.json({ run } satisfies RunResponse);
  },
);
