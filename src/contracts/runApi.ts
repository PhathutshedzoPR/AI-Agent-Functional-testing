import { z } from 'zod';
import {
  DeviceSchema,
  EXPORT_FORMATS,
  INPUT_LIMITS,
  RunEventSchema,
  TestRunSchema,
} from '@/core/domain';

/** Request and response shapes of /api/runs, shared by the route handlers and the browser. */

export const StartRunRequestSchema = z.object({
  targetUrl: z.url({ protocol: /^https?$/ }).max(INPUT_LIMITS.urlMaxChars),
  targetLabel: z.string().trim().min(1).max(80).optional(),
  story: z.string().trim().max(INPUT_LIMITS.storyMaxChars).nullable().optional(),
  reusePlanFrom: z.uuid().nullable().optional(),
  device: DeviceSchema.optional(),
});
export type StartRunRequest = z.infer<typeof StartRunRequestSchema>;

export const RunParamsSchema = z.object({ runId: z.uuid() });
export const StepParamsSchema = z.object({ runId: z.uuid(), stepId: z.uuid() });
export const ExportParamsSchema = z.object({ runId: z.uuid(), format: z.enum(EXPORT_FORMATS) });

export const RunResponseSchema = z.object({ run: TestRunSchema });
export type RunResponse = z.infer<typeof RunResponseSchema>;

export const RunListResponseSchema = z.object({ runs: z.array(TestRunSchema) });
export type RunListResponse = z.infer<typeof RunListResponseSchema>;

export const RunSnapshotResponseSchema = z.object({
  run: TestRunSchema,
  events: z.array(RunEventSchema),
});
export type RunSnapshotResponse = z.infer<typeof RunSnapshotResponseSchema>;

export const ErrorResponseSchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

export const runApiPaths = {
  runs: '/api/runs',
  run: (runId: string): string => `/api/runs/${encodeURIComponent(runId)}`,
  events: (runId: string): string => `/api/runs/${encodeURIComponent(runId)}/events`,
  cancel: (runId: string): string => `/api/runs/${encodeURIComponent(runId)}/cancel`,
  export: (runId: string, format: string): string =>
    `/api/runs/${encodeURIComponent(runId)}/export/${encodeURIComponent(format)}`,
  screenshot: (runId: string, stepId: string): string =>
    `/api/runs/${encodeURIComponent(runId)}/steps/${encodeURIComponent(stepId)}/screenshot`,
} as const;
