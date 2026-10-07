import { z } from 'zod';
import { DomainError } from '../errors';
import { DEVICES, INPUT_LIMITS, RUN_STATUSES } from './constants';
import { parseDomain } from './parseDomain';

export const RunStatusSchema = z.enum(RUN_STATUSES);
export type RunStatus = z.infer<typeof RunStatusSchema>;

export const DeviceSchema = z.enum(DEVICES);
export type Device = z.infer<typeof DeviceSchema>;

const FINAL_STATUSES: ReadonlySet<RunStatus> = new Set(['passed', 'failed', 'error', 'cancelled']);

export const TestRunSchema = z.object({
  id: z.uuid(),
  targetUrl: z.url().max(INPUT_LIMITS.urlMaxChars),
  targetLabel: z.string().min(1),
  story: z.string().max(INPUT_LIMITS.storyMaxChars).nullable(),
  status: RunStatusSchema,
  replayed: z.boolean(),
  device: DeviceSchema.default('desktop'),
  createdAt: z.iso.datetime(),
  finishedAt: z.iso.datetime().nullable(),
});

/** Run metadata kept by the repository. The detailed view is projected from its events. */
export type TestRun = z.infer<typeof TestRunSchema>;

export const TestRun = {
  create(input: unknown): TestRun {
    const run = parseDomain(TestRunSchema, input, 'test run');
    const story = run.story?.trim() ?? '';
    return { ...run, story: story.length > 0 ? story : null };
  },

  isFinal(status: RunStatus): boolean {
    return FINAL_STATUSES.has(status);
  },

  /** Returns a copy moved to `status`. A finished run never changes again. */
  transition(run: TestRun, status: RunStatus, at: Date): TestRun {
    if (TestRun.isFinal(run.status)) {
      throw new DomainError(`Run ${run.id} has already finished (${run.status}).`);
    }
    return {
      ...run,
      status,
      finishedAt: TestRun.isFinal(status) ? at.toISOString() : null,
    };
  },
} as const;
