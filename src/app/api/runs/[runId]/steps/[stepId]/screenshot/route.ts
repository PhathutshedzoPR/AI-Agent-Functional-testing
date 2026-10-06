import { StepParamsSchema } from '@/contracts';
import { withApiHandler } from '@/server/api';

export const GET = withApiHandler({ params: StepParamsSchema }, async ({ params, container }) => {
  const jpeg = await container.runs.screenshot(params.runId, params.stepId);
  return new Response(new Uint8Array(jpeg), {
    headers: {
      'Content-Type': 'image/jpeg',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, max-age=31536000, immutable',
    },
  });
});
