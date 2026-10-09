import { ExportParamsSchema } from '@/contracts';
import { withApiHandler } from '@/server/api';

export const GET = withApiHandler({ params: ExportParamsSchema }, async ({ params, container }) => {
  const report = await container.runs.export(params.runId, params.format);
  return new Response(report.body, {
    headers: {
      'Content-Type': report.contentType,
      'Content-Disposition': `attachment; filename="${report.fileName}"`,
      'X-Content-Type-Options': 'nosniff',
    },
  });
});
