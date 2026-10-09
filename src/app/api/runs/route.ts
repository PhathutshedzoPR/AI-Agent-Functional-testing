import { StartRunRequestSchema, type RunListResponse, type RunResponse } from '@/contracts';
import { withApiHandler } from '@/server/api';

export const POST = withApiHandler(
  { body: StartRunRequestSchema, sameOrigin: true, rateLimit: 'startRun' },
  async ({ body, container }) => {
    const run = await container.runs.start(body);
    return Response.json({ run } satisfies RunResponse, { status: 202 });
  },
);

export const GET = withApiHandler({}, async ({ container }) => {
  const runs = await container.runs.list();
  return Response.json({ runs: [...runs] } satisfies RunListResponse);
});
