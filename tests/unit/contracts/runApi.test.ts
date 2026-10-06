import { describe, expect, it } from 'vitest';
import {
  ExportParamsSchema,
  RunParamsSchema,
  StartRunRequestSchema,
  StepParamsSchema,
  runApiPaths,
} from '@/contracts';

const RUN = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const STEP = '16fd2706-8baf-433b-82eb-8c7fada847da';

describe('runApiPaths', () => {
  it('builds every API path and encodes ids', () => {
    expect(runApiPaths.runs).toBe('/api/runs');
    expect(runApiPaths.run(RUN)).toBe(`/api/runs/${RUN}`);
    expect(runApiPaths.events(RUN)).toBe(`/api/runs/${RUN}/events`);
    expect(runApiPaths.cancel(RUN)).toBe(`/api/runs/${RUN}/cancel`);
    expect(runApiPaths.export(RUN, 'junit')).toBe(`/api/runs/${RUN}/export/junit`);
    expect(runApiPaths.screenshot(RUN, STEP)).toBe(`/api/runs/${RUN}/steps/${STEP}/screenshot`);
    expect(runApiPaths.run('../x')).toBe('/api/runs/..%2Fx');
  });
});

describe('request schemas', () => {
  it('accept a well-formed start request and trim the story', () => {
    const parsed = StartRunRequestSchema.parse({
      targetUrl: 'http://localhost:3000/demo-shop/stable',
      story: '  Order two kotas  ',
      reusePlanFrom: RUN,
    });

    expect(parsed.story).toBe('Order two kotas');
  });

  it.each([
    ['a non-http URL', { targetUrl: 'javascript:alert(1)' }],
    ['an over-long story', { targetUrl: 'http://localhost:3000/', story: 'x'.repeat(2_001) }],
    ['a plan id that is not a UUID', { targetUrl: 'http://localhost:3000/', reusePlanFrom: '1' }],
  ])('reject %s', (_label, body) => {
    expect(StartRunRequestSchema.safeParse(body).success).toBe(false);
  });

  it('only accept UUID ids and known export formats in routes', () => {
    expect(RunParamsSchema.safeParse({ runId: RUN }).success).toBe(true);
    expect(RunParamsSchema.safeParse({ runId: 'run-1' }).success).toBe(false);
    expect(StepParamsSchema.safeParse({ runId: RUN, stepId: '../../x' }).success).toBe(false);
    expect(ExportParamsSchema.safeParse({ runId: RUN, format: 'spec' }).success).toBe(true);
    expect(ExportParamsSchema.safeParse({ runId: RUN, format: 'pdf' }).success).toBe(false);
  });
});
