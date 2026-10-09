import { z } from 'zod';

const positiveInt = (fallback: number) => z.coerce.number().int().positive().default(fallback);

export const LIVE_PROVIDERS = ['google', 'anthropic', 'openai', 'openrouter', 'nvidia'] as const;
type LiveProvider = (typeof LIVE_PROVIDERS)[number];

const PROVIDER_KEYS: Readonly<Record<LiveProvider, ProviderKey>> = {
  google: 'GOOGLE_GENERATIVE_AI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
  nvidia: 'NVIDIA_API_KEY',
};
type ProviderKey =
  | 'GOOGLE_GENERATIVE_AI_API_KEY'
  | 'ANTHROPIC_API_KEY'
  | 'OPENAI_API_KEY'
  | 'OPENROUTER_API_KEY'
  | 'NVIDIA_API_KEY';

// "openrouter:vendor/model:free,nvidia:vendor/model": the provider ends at the first colon, the
// model id (which may contain colons) is the rest.
const FallbacksSchema = z
  .string()
  .default('')
  .transform((csv) =>
    csv
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
      .map((entry) => {
        const colon = entry.indexOf(':');
        return colon < 0
          ? { provider: entry, model: '' }
          : { provider: entry.slice(0, colon), model: entry.slice(colon + 1).trim() };
      }),
  )
  .pipe(z.array(z.object({ provider: z.enum(LIVE_PROVIDERS), model: z.string().min(1) })));

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

    LLM_PROVIDER: z.enum([...LIVE_PROVIDERS, 'replay']).default('replay'),
    LLM_MODEL: z.string().trim().optional(),
    LLM_RECORD: z.stringbool().default(false),
    LLM_REPLAY_DIR: z.string().default('fixtures/llm-replays'),
    GOOGLE_GENERATIVE_AI_API_KEY: z.string().trim().optional(),
    ANTHROPIC_API_KEY: z.string().trim().optional(),
    OPENAI_API_KEY: z.string().trim().optional(),
    OPENROUTER_API_KEY: z.string().trim().optional(),
    NVIDIA_API_KEY: z.string().trim().optional(),
    // Backup models tried in order when the main one fails (overloaded, out of quota).
    LLM_FALLBACKS: FallbacksSchema,

    APP_BASE_URL: z.url({ protocol: /^https?$/ }),
    DATA_DIR: z.string().default('.data'),
    TARGET_MODE: z.enum(['allowlist', 'public']).default('allowlist'),
    TARGET_ALLOWLIST: z
      .string()
      .default('')
      .transform((csv) =>
        csv
          .split(',')
          .map((host) => host.trim().toLowerCase())
          .filter((host) => host.length > 0),
      ),

    AGENT_MAX_PAGES: positiveInt(5),
    AGENT_MAX_SCENARIOS: positiveInt(4),
    AGENT_MAX_STEPS: positiveInt(12),
    AGENT_MAX_LLM_CALLS: positiveInt(12),
    AGENT_STEP_TIMEOUT_MS: positiveInt(5_000),
    AGENT_RUN_TIMEOUT_MS: positiveInt(180_000),
    AGENT_HEAL_MIN_CONFIDENCE: z.coerce.number().min(0).max(1).default(0.7),
    AGENT_SNAPSHOT_MAX_CHARS: positiveInt(12_000),
    AGENT_HEADLESS: z.stringbool().default(true),
    AGENT_SLOW_MO_MS: z.coerce.number().int().min(0).default(0),

    RATE_LIMIT_RUNS_PER_MINUTE: positiveInt(5),
  })
  .superRefine((env, ctx) => {
    if (env.LLM_PROVIDER === 'replay') {
      if (env.LLM_RECORD) {
        ctx.addIssue({
          code: 'custom',
          path: ['LLM_RECORD'],
          message: 'recording needs a live provider, not replay',
        });
      }
      return;
    }
    if (!env.LLM_MODEL) {
      ctx.addIssue({
        code: 'custom',
        path: ['LLM_MODEL'],
        message: `required when LLM_PROVIDER is ${env.LLM_PROVIDER}`,
      });
    }
    const needs = [
      { provider: env.LLM_PROVIDER, why: `when LLM_PROVIDER is ${env.LLM_PROVIDER}` },
      ...env.LLM_FALLBACKS.map((fallback) => ({
        provider: fallback.provider,
        why: `for the ${fallback.provider} fallback in LLM_FALLBACKS`,
      })),
    ];
    for (const { provider, why } of needs) {
      const keyName = PROVIDER_KEYS[provider];
      if (!env[keyName])
        ctx.addIssue({ code: 'custom', path: [keyName], message: `required ${why}` });
    }
  });

export type Env = z.infer<typeof EnvSchema>;

/**
 * Validates environment variables. Blank values count as unset so `.env.example` placeholders
 * fall back to defaults. Error messages name the variable, never its value.
 */
export function parseEnv(source: Readonly<Record<string, string | undefined>>): Env {
  const present = Object.fromEntries(
    Object.entries(source).filter(([, value]) => value !== undefined && value.trim() !== ''),
  );
  const result = EnvSchema.safeParse(present);
  if (result.success) return result.data;

  const problems = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
  throw new Error(
    `Invalid environment configuration. Check .env.local against .env.example.\n- ${problems.join('\n- ')}`,
  );
}

let cached: Env | undefined;

/** Parses `process.env` on first use and memoises the result. */
export function getEnv(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}
