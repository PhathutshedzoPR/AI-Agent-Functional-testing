/**
 * TestPilot without the web UI: the same container and agent, driven from a terminal or CI.
 *
 *   npm run agent -- --url <url> [--story "<text>"] [--device desktop|iphone|android] [--out reports]
 *
 * Prints the agent's narration as it runs, writes JUnit XML and a Markdown report, and exits 1
 * when a test fails (2 for bad arguments), so a pipeline can gate on it.
 */
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import {
  DeviceSchema,
  TestRun,
  applyRunEvent,
  narrateEvent,
  summariseRun,
  EMPTY_RUN_VIEW,
  type RunView,
} from '@/core/domain';
import { createContainer } from '@/server/createContainer';
import { parseEnv } from '@/server/env';
import { createLogger } from '@/server/logger';

const POLL_MS = 500;
const USAGE =
  'Usage: npm run agent -- --url <url> [--story "<text>"] [--device desktop|iphone|android] [--out reports]';

type Runs = ReturnType<typeof createContainer>['runs'];

function say(line: string): void {
  process.stdout.write(`${line}\n`);
}

function readOptions() {
  const { values } = parseArgs({
    options: {
      url: { type: 'string' },
      story: { type: 'string' },
      device: { type: 'string', default: 'desktop' },
      out: { type: 'string', default: 'reports' },
    },
  });
  const device = DeviceSchema.safeParse(values.device);
  if (!values.url || !device.success) {
    process.stderr.write(`${USAGE}\n`);
    process.exit(2);
  }
  return { url: values.url, story: values.story ?? null, device: device.data, out: values.out };
}

/** Follows the run's events, narrating each one, until it finishes. */
async function follow(runs: Runs, runId: string): Promise<RunView> {
  let view = EMPTY_RUN_VIEW;
  for (;;) {
    const { run, events } = await runs.get(runId);
    for (const event of events.filter((e) => e.seq > view.lastSeq)) {
      const line = narrateEvent(event, view);
      view = applyRunEvent(view, event);
      if (line) say(`  ${line.text}`);
    }
    if (TestRun.isFinal(run.status)) return view;
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
}

async function writeReports(runs: Runs, runId: string, out: string): Promise<void> {
  await mkdir(out, { recursive: true });
  for (const format of ['junit', 'markdown'] as const) {
    const report = await runs.export(runId, format);
    await writeFile(join(out, report.fileName), report.body, 'utf8');
    say(`Wrote ${join(out, report.fileName)}`);
  }
}

async function main(): Promise<void> {
  const options = readOptions();
  if (existsSync('.env.local')) process.loadEnvFile('.env.local');
  // Logs go to stderr as JSON lines, so stdout stays readable.
  const logger = createLogger((_level, line) => process.stderr.write(`${line}\n`));
  const { runs } = createContainer(parseEnv(process.env), logger);

  say(`TestPilot: ${options.url} on a ${options.device} screen`);
  const started = await runs.start({
    targetUrl: options.url,
    story: options.story,
    device: options.device,
  });
  const view = await follow(runs, started.id);
  await writeReports(runs, started.id, options.out);

  const summary = summariseRun(view);
  if (summary) say(summary.headline);
  process.exitCode = view.status === 'passed' ? 0 : 1;
}

// The exit code carries the result; an unexpected error is printed and fails the run.
void main().catch((error: unknown) => {
  const reason = error instanceof Error ? error.message : String(error);
  process.stderr.write(`TestPilot stopped: ${reason}\n`);
  process.exitCode = 1;
});
