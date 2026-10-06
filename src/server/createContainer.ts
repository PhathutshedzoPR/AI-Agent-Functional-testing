import { PlaywrightBrowserFactory } from '@/adapters/browser';
import { InMemoryEventBus } from '@/adapters/events';
import { createLanguageModel } from '@/adapters/llm';
import { TargetUrlGuard, resolveHostWithDns } from '@/adapters/security';
import { FileArtifactStore, InMemoryRunRepository } from '@/adapters/storage';
import { CryptoIdGenerator, SystemClock } from '@/adapters/system';
import {
  BugReporter,
  ScenarioExecutor,
  SelfHealer,
  SiteExplorer,
  StepFactory,
  TestAgent,
  TestPlanner,
  createDefaultActionRegistry,
  createDefaultHealingStrategies,
} from '@/core/agent';
import { INPUT_LIMITS } from '@/core/domain';
import type {
  IArtifactStore,
  IClock,
  IIdGenerator,
  ILanguageModel,
  ITargetPolicy,
} from '@/core/ports';
import { RunQueue, RunService } from '@/core/services';
import type { Env } from './env';
import type { Logger } from './logger';
import { RateLimiter } from './security/RateLimiter';

export type Container = Readonly<{
  env: Env;
  runs: RunService;
  rateLimits: Readonly<{ startRun: RateLimiter }>;
  logger: Logger;
}>;

type Shared = Readonly<{ clock: IClock; ids: IIdGenerator; artifacts: IArtifactStore }>;

/** Replaceable parts, for integration tests that script the model but keep everything else real. */
export type ContainerOverrides = Readonly<{ llm?: ILanguageModel }>;

/**
 * Composition root: the only place that constructs adapters (constructor injection). It has no
 * Next imports, so the CLI and tests can build the same graph.
 */
export function createContainer(
  env: Env,
  logger: Logger,
  overrides: ContainerOverrides = {},
): Container {
  const shared: Shared = {
    clock: new SystemClock(),
    ids: new CryptoIdGenerator(),
    artifacts: new FileArtifactStore(env.DATA_DIR),
  };
  const policy = buildPolicy(env);
  const logError = (message: string, error: unknown): void => logger.error(message, { error });
  const runs = new RunService({
    ...shared,
    repository: new InMemoryRunRepository(),
    bus: new InMemoryEventBus(),
    queue: new RunQueue((error) => logError('A queued run failed outside its own handling', error)),
    agent: buildAgent(env, policy, shared),
    llm: overrides.llm ?? buildLanguageModel(env),
    policy,
    runTimeoutMs: env.AGENT_RUN_TIMEOUT_MS,
    logError,
  });
  return {
    env,
    runs,
    rateLimits: { startRun: new RateLimiter(env.RATE_LIMIT_RUNS_PER_MINUTE) },
    logger,
  };
}

function buildPolicy(env: Env): ITargetPolicy {
  return new TargetUrlGuard(
    {
      mode: env.TARGET_MODE,
      allowlist: env.TARGET_ALLOWLIST,
      appBaseUrl: new URL(env.APP_BASE_URL),
      maxUrlChars: INPUT_LIMITS.urlMaxChars,
    },
    resolveHostWithDns,
  );
}

function buildAgent(env: Env, policy: ITargetPolicy, { clock, ids, artifacts }: Shared): TestAgent {
  const registry = createDefaultActionRegistry();
  return new TestAgent({
    browsers: new PlaywrightBrowserFactory(policy),
    explorer: new SiteExplorer({
      maxPages: env.AGENT_MAX_PAGES,
      snapshotMaxChars: env.AGENT_SNAPSHOT_MAX_CHARS,
    }),
    planner: new TestPlanner(new StepFactory(registry, ids), ids, {
      maxScenarios: env.AGENT_MAX_SCENARIOS,
      maxSteps: env.AGENT_MAX_STEPS,
    }),
    executor: new ScenarioExecutor({
      registry,
      artifacts,
      clock,
      ids,
      repairer: new SelfHealer(createDefaultHealingStrategies(), {
        minConfidence: env.AGENT_HEAL_MIN_CONFIDENCE,
        snapshotMaxChars: env.AGENT_SNAPSHOT_MAX_CHARS,
      }),
    }),
    reporter: new BugReporter(ids),
    clock,
    ids,
    settings: {
      maxPages: env.AGENT_MAX_PAGES,
      maxScenarios: env.AGENT_MAX_SCENARIOS,
      maxSteps: env.AGENT_MAX_STEPS,
      maxLlmCalls: env.AGENT_MAX_LLM_CALLS,
      stepTimeoutMs: env.AGENT_STEP_TIMEOUT_MS,
      headless: env.AGENT_HEADLESS,
      slowMoMs: env.AGENT_SLOW_MO_MS,
    },
  });
}

function buildLanguageModel(env: Env): ILanguageModel {
  return createLanguageModel({
    provider: env.LLM_PROVIDER,
    model: env.LLM_MODEL,
    record: env.LLM_RECORD,
    replayDir: env.LLM_REPLAY_DIR,
    keys: {
      google: env.GOOGLE_GENERATIVE_AI_API_KEY,
      anthropic: env.ANTHROPIC_API_KEY,
      openai: env.OPENAI_API_KEY,
    },
  });
}
