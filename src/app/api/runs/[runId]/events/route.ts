import { RunParamsSchema } from '@/contracts';
import { withApiHandler } from '@/server/api';
import { runEventStream, sseResponse } from '@/server/http';

export const GET = withApiHandler(
  { params: RunParamsSchema },
  async ({ request, params, container }) => {
    await container.runs.get(params.runId);
    // Browsers resend the last id they saw when they reconnect; start after it.
    const lastSeen = Number.parseInt(request.headers.get('last-event-id') ?? '0', 10);
    const afterSeq = Number.isFinite(lastSeen) && lastSeen > 0 ? lastSeen : 0;
    return sseResponse(runEventStream(container.runs, params.runId, afterSeq), request.signal);
  },
);
