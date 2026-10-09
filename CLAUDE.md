# TestPilot: working rules for Claude Code

Read this file before every task, then open `docs/ROADMAP.md` and work on the first unchecked task.
After scaffolding, also read `AGENTS.md` (written by `next dev`). It points at the Next.js docs bundled in `node_modules/next/dist/docs/`, which beat your memory for Next 16.

---

## 1. What we're building

TestPilot is an AI agent for functional testing. Our team is building it for the Sebaka Testing AI Hackathon 2026, functional testing track.

- Repo submitted: **Wed 7 Oct 2026**. Live demo: **Sat 10 Oct 2026**, UJ JBS.
- Demo rules: 5 minutes, live demo mandatory, no code walkthrough.
- Judging: **Innovation** (most points), **Tech stack and code quality** (most points), then polish, usability and how well the demo proves it works.

Sebaka asks every team to show what the agent receives, decides, executes and delivers:

| Stage | What TestPilot does |
|---|---|
| Receives | A target URL and, optionally, a user story with acceptance criteria. |
| Decides | Explores the site (accessibility tree of each page) and plans happy-path, negative and edge-case scenarios. |
| Executes | Runs every step in real Chromium through Playwright, screenshots each step, and re-finds elements whose locator broke (self-healing). |
| Delivers | A live dashboard, bug reports (steps, expected vs actual, screenshot), JUnit XML, Markdown and a runnable Playwright `.spec.ts`. |

### Rule zero: the LLM proposes, Playwright decides

Sebaka's deck warns about agents that look good in a LinkedIn post and fall apart under a real test. So:

1. The LLM only produces plans, locator suggestions and wording. It never decides pass or fail.
2. Every verdict comes from a Playwright action or assertion. Every screenshot is a real capture. Every duration is measured.
3. No simulated, random or hard-coded results anywhere in `src/`. Fakes live in `tests/` only.
4. Replay mode (section 7) replays recorded LLM *responses*. The browser still runs for real, and the UI labels the run "Replayed plan".

---

## 2. Stack

| Concern | Choice | Notes |
|---|---|---|
| App | Next.js 16, App Router, TypeScript, `src/` dir | One app serves the dashboard, the API and the demo target. Needs a long-lived Node server (laptop, VM, Docker), not serverless, because it launches Chromium. |
| Runtime | Node 22 LTS | Next 16 needs at least 20.9. |
| UI | Tailwind CSS v4, shadcn/ui primitives restyled to our tokens, `lucide-react`, `motion` | Tokens live in `src/app/globals.css` under `@theme`. |
| Browser | `playwright` (Chromium only) | A runtime dependency of the agent, not only a test tool. |
| LLM | Vercel AI SDK (`ai`) with `@ai-sdk/google` (default), `@ai-sdk/anthropic`, `@ai-sdk/openai` | Structured output: `generateText({ model, output: Output.object({ schema }), prompt })`, read `result.output`. |
| Validation | Zod 4 | Env, API input, LLM output. |
| Security helpers | `ipaddr.js`, `server-only` | |
| Tests | Vitest, `@vitest/coverage-v8` (lcov) | Integration tests drive real Chromium. |
| Quality | ESLint flat config (`eslint-config-next`, `typescript-eslint` type-checked, `eslint-plugin-sonarjs`), Prettier, SonarQube Cloud in GitHub Actions | |

Before writing framework code, check the installed versions in `package.json` and read the matching docs. Next 16 facts that trip people up:
- `params`, `searchParams`, `cookies()` and `headers()` are async. Use the generated `PageProps<'/route'>` and `RouteContext<'/route'>` types (`next typegen`).
- `middleware.ts` is now `proxy.ts`. `next lint` is gone: run `eslint .`. Turbopack is the default bundler.
- If Turbopack tries to bundle Playwright, add it to `serverExternalPackages` in `next.config.ts`.

---

## 3. Architecture

Ports and adapters. Dependencies point inward, towards `core`.

```
app/ + components/  ──►  server/  ──►  core/  ◄──  adapters/
(pages, API routes)      (wiring,      (agent,     (Playwright, LLM, storage,
                          HTTP,         domain,     events, exporters,
                          security)     ports)      URL policy)
```

- `src/core` is plain TypeScript. It must not import `next`, `react`, `playwright`, `ai`, `@ai-sdk/*`, `node:*`, or anything from `adapters`, `server`, `app` or `components`. Enforce this with `no-restricted-imports` in `eslint.config.mjs`.
- `src/adapters` implement the interfaces in `src/core/ports`.
- `src/server/createContainer.ts` is the only place that calls `new` on adapters (constructor injection). `src/server/container.ts` imports `server-only`, caches the container on `globalThis` (safe under hot reload) and is what route handlers use. The CLI calls `createContainer` directly.
- Route handlers stay thin: validate input, call one `RunService` method, return the result. Shared HTTP logic lives in `src/server/http`.
- Client components may import types from `src/core/domain` (with `import type`), the pure `projectRun` reducer, and schemas from `src/contracts`. Nothing else from `core`, and never `server` or `adapters`.
- Vitest: alias `server-only` to an empty module in `vitest.config.ts`, or tests that touch the container will throw.

### Folder structure

```
.
├── .github/
│   ├── workflows/ci.yml              # lint, typecheck, unit tests + coverage, build, SonarQube Cloud
│   └── dependabot.yml
├── docs/ROADMAP.md
├── fixtures/llm-replays/             # recorded LLM responses for replay mode (committed, no secrets)
├── scripts/run-agent.ts              # CLI: same agent, no web UI (Phase 5)
├── src/
│   ├── app/
│   │   ├── (marketing)/page.tsx                        # landing page
│   │   ├── (dashboard)/layout.tsx                      # dark app shell with sidebar
│   │   ├── (dashboard)/runs/page.tsx                   # run history
│   │   ├── (dashboard)/runs/new/page.tsx               # choose a target, describe what to test
│   │   ├── (dashboard)/runs/[runId]/page.tsx           # live run and report
│   │   ├── demo-shop/[release]/...                     # Kota Express: menu, cart, checkout, confirmation
│   │   ├── demo-shop/_config/releases.ts               # release labels and seeded-bug flags
│   │   ├── api/runs/route.ts                           # POST start a run, GET list runs
│   │   ├── api/runs/[runId]/route.ts                   # GET run snapshot
│   │   ├── api/runs/[runId]/events/route.ts            # GET Server-Sent Events stream
│   │   ├── api/runs/[runId]/cancel/route.ts            # POST cancel
│   │   ├── api/runs/[runId]/export/[format]/route.ts   # json | junit | markdown | spec
│   │   ├── api/runs/[runId]/steps/[stepId]/screenshot/route.ts
│   │   ├── layout.tsx
│   │   └── globals.css                                 # Tailwind v4 and design tokens
│   ├── components/
│   │   ├── ui/          # Button, Card, Badge, Input, Textarea, Tabs, Tooltip, Dialog
│   │   ├── brand/       # Logo, Mascot
│   │   ├── marketing/   # Hero, WorkflowSteps, WhatsReal, DemoShopTeaser
│   │   ├── runs/        # TargetPicker, StoryComposer, SuggestionCard, FlightPath, Waypoint, LiveBrowser,
│   │   │                # StatTile, AgentFeed, StepList, BugCard, ReviewList, TraceabilityTable, ExportMenu
│   │   └── demo-shop/   # ShopHeader, MenuItemCard, CartSummary, CheckoutForm
│   ├── contracts/       # Zod schemas for API requests and responses, shared by client and server
│   ├── core/
│   │   ├── domain/      # Locator, PlanStep, Scenario, TestPlan, StepResult, Healing, Finding,
│   │   │                # BugReport, TestRun, RunEvent, projectRun (events -> view state)
│   │   ├── ports/       # IBrowserFactory, IBrowserSession, ILanguageModel, ITargetPolicy, IRunRepository,
│   │   │                # IArtifactStore, IEventBus, IReportExporter, IClock, IIdGenerator
│   │   ├── agent/       # TestAgent, SiteExplorer, TestPlanner, ScenarioExecutor, SelfHealer, BugReporter, StepFactory
│   │   │   ├── actions/ # one class per action, plus ActionRegistry
│   │   │   └── healing/ # one class per healing strategy
│   │   ├── prompts/     # prompt builders and Zod output schemas: plan, heal, report wording
│   │   ├── services/    # RunService, RunQueue
│   │   └── errors/      # AppError, DomainError, ValidationError, TargetBlockedError, LlmError, BrowserError
│   ├── adapters/
│   │   ├── browser/     # PlaywrightBrowserFactory, PlaywrightBrowserSession, LocatorResolver
│   │   ├── llm/         # AiSdkLanguageModel, RecordingLanguageModel, ReplayLanguageModel, createLanguageModel
│   │   ├── security/    # TargetUrlGuard (implements ITargetPolicy)
│   │   ├── storage/     # InMemoryRunRepository, FileArtifactStore
│   │   ├── events/      # InMemoryEventBus
│   │   ├── exporters/   # JsonExporter, JUnitExporter, MarkdownExporter, PlaywrightSpecExporter, ExporterRegistry
│   │   └── system/      # SystemClock, CryptoIdGenerator
│   ├── server/
│   │   ├── createContainer.ts   # composition root, no Next imports
│   │   ├── container.ts         # Next entry: server-only, globalThis cache
│   │   ├── env.ts               # parseEnv (Zod) and getEnv (lazy, memoised)
│   │   ├── logger.ts            # structured logs, redacts secrets
│   │   ├── http/                # withApiHandler, errorResponse, sseResponse, assertSameOrigin
│   │   └── security/            # RateLimiter, securityHeaders
│   ├── hooks/           # useRunStream, useRun
│   └── lib/             # cn, formatDuration, formatRand
├── tests/
│   ├── unit/            # mirrors src/
│   ├── integration/     # agent against Kota Express: real Chromium, replayed LLM
│   └── fakes/           # FakeBrowserSession, FakeLanguageModel, FixedClock, SequentialIdGenerator
├── .env.example
├── eslint.config.mjs
├── next.config.ts
├── sonar-project.properties
├── vitest.config.ts
├── CLAUDE.md
└── README.md
```

### Patterns (use where they fit; name the pattern in one short comment)

- **Strategy**: step actions, healing strategies, exporters (each behind an interface, picked from a registry).
- **Template Method**: `TestAgent.run()` fixes the pipeline explore, plan, execute, report.
- **Observer**: `IEventBus` publishes `RunEvent`s; the SSE route subscribes.
- **Decorator**: `RecordingLanguageModel` wraps any `ILanguageModel`.
- **Adapter**: Playwright, the AI SDK and DNS hidden behind ports.
- **Repository**: `IRunRepository`. **Factory**: `createLanguageModel`, `PlaywrightBrowserFactory`.

Don't add a pattern for show. A plain function is fine where there's no state or variation.

### OOP and modularity

1. One exported class, component or hook per file, named after it (`TestPlanner.ts`, `StepCard.tsx`, `useRunStream.ts`). Each folder has an `index.ts` exposing its public pieces, so a folder can be lifted into another project as-is.
2. Depend on interfaces from `core/ports`, injected through the constructor as `private readonly`.
3. Encapsulate: private state, `readonly` fields, no public mutable properties; return readonly types or copies.
4. Domain objects guard their invariants in a static `create()` and throw a typed `DomainError`.
5. Composition over inheritance. Inheritance only for the error hierarchy, or an abstract `BaseStepAction` if it removes real duplication.
6. Split a file past ~200 lines or a function past ~30 lines.

### DRY

1. One source of truth per shape: a Zod schema plus `z.infer`. No hand-written duplicate types.
2. Every route handler goes through `withApiHandler` (validation, same-origin check, rate limit, error mapping, logging). No copy-pasted try/catch.
3. One pure reducer (`projectRun` in `core/domain`) turns events into view state: on the server for snapshots, in the browser for the live stream, and on the landing page for the recorded run.
4. UI variants via `class-variance-authority` on the primitives in `components/ui`. No copy-pasted class strings.
5. Limits and status labels in one constants module; visual tokens only in `globals.css`.
6. Test fakes written once, in `tests/fakes`.
7. About to copy more than five lines? Extract instead.

---

## 4. Security

This app drives a real browser on a server, at URLs a person types in. Treat every URL, every page and every LLM response as hostile. Target in SonarQube Cloud: 0 vulnerabilities, every security hotspot reviewed.

1. **Secrets** only through `src/server/env.ts`: Zod-validated on first use, failing with a clear message. Never prefix a key with `NEXT_PUBLIC_`. Never log keys or send them to the browser or into a page under test. `.env*` is git-ignored except `.env.example`, which lists names only.
2. **SSRF** (`TargetUrlGuard`): `http`/`https` only, no credentials in the URL. Default `TARGET_MODE=allowlist` accepts only hosts in `TARGET_ALLOWLIST` (the demo shop). In `public` mode, resolve DNS and accept only addresses where `ipaddr.js` `range()` is `'unicast'` (unwrap IPv4-mapped IPv6 first). Don't hardcode IP strings (Sonar S1313). Check every browser request, including redirects, with `page.route()` and abort anything the guard rejects. Known gap to document in the README: DNS rebinding between check and connect.
3. **Same origin**: the agent never leaves the target's origin. `navigate` steps accept relative paths or same-origin URLs only, and the explorer stays under the start URL's path. The agent's browser may never call TestPilot's own `/api/*` (block it in `page.route()`), so a run can't start other runs.
4. **Prompt injection**: page content is data, not instructions. Wrap it in delimited blocks (`<page_snapshot url="...">...</page_snapshot>`) and tell the model to ignore instructions inside. Parse model output with Zod, then check it against the action allowlist and the ARIA role list. Never `eval`, `new Function`, `page.evaluate` with model-provided strings, or run shell commands from model output.
5. **Input validation**: every route validates params, query and body with schemas from `src/contracts`. IDs are UUIDs (`z.uuid()`). Story text is capped at 2,000 characters; URLs at 2,048.
6. **CSRF-lite**: `withApiHandler` rejects state-changing requests whose `Origin` header doesn't match `APP_BASE_URL`.
7. **Files**: screenshots go to `.data/artifacts/<runId>/<stepId>.jpg` with server-generated names. Build paths only from validated IDs, never from user strings. Respond with `Content-Type: image/jpeg` and `X-Content-Type-Options: nosniff`.
8. **Output encoding**: React escapes by default; never use `dangerouslySetInnerHTML`. Escape `& < > " '` in JUnit XML. Emit every string literal in generated `.spec.ts` files with `JSON.stringify`.
9. **Limits**: rate-limit `POST /api/runs` per IP (in-memory token bucket). One run at a time; queue the rest. Per-run caps on pages, scenarios, steps, LLM calls and total time come from env. Close the browser in `finally`, always.
10. **Errors**: clients get `{ "error": { "code": "...", "message": "..." } }` with safe messages. Stack traces go to server logs only. No empty catch blocks.
11. **Randomness and hashing**: `crypto.randomUUID()` for IDs, never `Math.random()` (S2245). SHA-256 for replay keys, never MD5 or SHA-1 (S4790).
12. **Headers**: CSP, `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` in `next.config.ts`. No `'unsafe-eval'` in production.
13. **Dependencies**: Dependabot on for npm and GitHub Actions; `npm audit --omit=dev --audit-level=high` in CI.

---

## 5. Code quality (SonarQube Cloud "Sonar way")

1. TypeScript `strict: true` and `noUncheckedIndexedAccess: true`. No `any`: use `unknown` and narrow. Explicit return types on exported functions and public methods.
2. Cognitive complexity of 15 or less per function (S3776). No nested ternaries (S3358). At most 4 parameters; use an options object beyond that.
3. React: props typed as `Readonly<Props>` (S6759). No array index as `key` (S6479). Memoise context provider values (S6481). Every form control has an associated `<label>` (S6853). Clicks go on `<button>` or `<a>`, not on `<div>` (S6848).
4. No `TODO` or `FIXME` comments in commits (S1135). Add a roadmap item instead.
5. No `console.log` in `src/`. Use `src/server/logger.ts`.
6. No commented-out code, unused imports or variables, or empty functions.
7. No `http://` literals in `src/` (S5332). Base URLs come from env.
8. Every promise is awaited or deliberately `void`-ed with a comment explaining why (`@typescript-eslint/no-floating-promises`).
9. Coverage at least 80% for `src/core`, `src/adapters`, `src/server`, `src/contracts` and `src/lib` (the gate checks new code at 80%). Only presentational and glue code goes in `sonar.coverage.exclusions`, each with a reason comment.
10. Duplication under 3%.
11. Comments explain why, not what.
12. Never silence a rule to get green: no `eslint-disable`, `@ts-ignore` or `@ts-expect-error` unless the line also explains why and a human agreed.

---

## 6. Agent design

### Locators: semantic only

```ts
Locator = { by: 'role' | 'label' | 'placeholder' | 'text' | 'testId'; value: string; role: AriaRole | null; exact: boolean;
            within: { role: AriaRole; hasText: string } | null }  // scope to a container, e.g. the menu item for one kota
```

Maps one-to-one to `getByRole(role, { name: value, exact })`, `getByLabel`, `getByPlaceholder`, `getByText`, `getByTestId`, prefixed by `page.getByRole(within.role).filter({ hasText: within.hasText })` when `within` is set. No raw CSS or XPath from the model. Preference order for the planner: role + name, label, placeholder, text, testId. A locator must match exactly one element; repeated controls (an "Add to order" button on every menu item) need `within`.

### Actions: allowlist (Strategy, one class per file)

Each implements `IStepAction` and is registered in `ActionRegistry`. A new action is one new file plus one registration line. `StepFactory` enforces this table:

| Action | `target` | `value` |
|---|---|---|
| `navigate` | null | Same-origin path or URL |
| `click`, `check` | Required | null |
| `fill` | Required | Text to type |
| `select` | Required | Option label |
| `press` | Optional | Key, e.g. `Enter` |
| `assertVisible`, `assertHidden` | Required | null |
| `assertText` | Optional (whole page when null) | Expected text |
| `assertUrl` | null | Expected path or fragment |
| `assertValue` | Required | Expected field value |

`assertText` normalises whitespace (including U+00A0) and matches case-insensitively with "contains". When the expected value is a rand amount, compare numbers, not strings (`R 70,00` equals `R70.00`).

### Page snapshot for the model

`page.locator('body').ariaSnapshot()` (YAML accessibility tree), trimmed to `AGENT_SNAPSHOT_MAX_CHARS`, plus URL and title. Cheaper and more stable than HTML.

### Plan schema: keep it flat (no unions) so every provider can produce it

```ts
TestPlan = { summary: string; scenarios: Scenario[] }                  // 1..AGENT_MAX_SCENARIOS
Scenario = { id: string; title: string; kind: 'happy' | 'negative' | 'edge';
             criterion: string | null; priority: 'high' | 'medium' | 'low'; steps: PlanStep[] }  // 1..AGENT_MAX_STEPS
PlanStep = { action: ActionType; target: Locator | null; value: string | null; intent: string }
```

Use `.nullable()`, not `.optional()` (strict structured-output modes need every key present). Add `.describe()` to fields to guide the model. Per-action rules (for example, `fill` needs `target` and `value`) live in `StepFactory`, not in the LLM schema. Invalid steps are dropped and shown as planner warnings, never executed.

### Execution

- One browser per run, a fresh context per scenario (clean cookies and storage), viewport 1280 x 800, timeout `AGENT_STEP_TIMEOUT_MS`.
- After each step: JPEG screenshot (quality about 60), measured duration, current URL. Record console errors and responses with status 400 or above as `Finding`s.
- Step status: `passed | healed | failed | skipped`. After a failed step, skip the rest of that scenario.

### Self-healing (`SelfHealer`)

Only for "element not found" or "matched more than one element" on interaction steps. A failed assertion is a bug, never a heal.

1. Rule strategies first, no LLM: same role with a similar accessible name (case-insensitive, contains, normalised whitespace), then label, placeholder and text alternatives from the fresh snapshot.
2. Then one LLM call: intent, old locator and fresh aria snapshot in, `{ locator, confidence, reason }` out.
3. Accept only if the new locator matches exactly one visible element and confidence is at least `AGENT_HEAL_MIN_CONFIDENCE`. Retry the action once.
4. Record `{ from, to, method: 'rule' | 'llm', reason }`. Healed steps show amber and land in "Needs review", because a heal can hide a real regression. A heal on a page the explorer never saw says so in `reason`.

### Bug reports

`BugReport = { id, title, severity, scenarioId, stepsToReproduce, expected, actual, screenshotStepId, findings }`.
Severity default: failed happy path is high, negative is medium, edge is low. Titles and summaries may come from one batched LLM call at the end of the run; if that fails, use a template. Never let the wording call change a verdict.

### Events (Server-Sent Events)

`run.started`, `explore.page`, `plan.ready`, `scenario.started`, `step.started`, `step.finished` (status, duration, healing), `finding`, `scenario.finished`, `bug.reported`, `run.finished`, `run.failed`, `run.cancelled`. Every event carries `runId`, `seq` and `at`.
The SSE route subscribes first, then replays stored events, then streams new ones, de-duplicating by `seq`. It stops on `request.signal` abort.

---

## 7. LLM usage

- Provider and model from env: `LLM_PROVIDER=google | anthropic | openai | replay`, `LLM_MODEL=<id from the provider console>`. Never hardcode model IDs in code.
- Every call goes through `ILanguageModel.generateObject({ purpose, system, prompt, schema })`. The AI SDK adapter maps SDK errors (including `NoObjectGeneratedError`) to `LlmError`, and retries once on 429 or 5xx with backoff.
- Budget per run: one plan call, at most one LLM heal per broken step, one wording call. Hard cap `AGENT_MAX_LLM_CALLS`. The UI shows "LLM calls used".
- Temperature 0 to 0.3 for plans and heals.
- `LLM_RECORD=true` wraps the live model in `RecordingLanguageModel`, which saves each response to `fixtures/llm-replays/<sha256 of purpose + prompt>.json`. `LLM_PROVIDER=replay` serves them through `ReplayLanguageModel`. Integration tests and the offline demo fallback use replay. Prompts must be deterministic (no run IDs, timestamps or random values) or replay keys won't match. When a prompt builder changes, re-record.
- Prompts live in `core/prompts`, one builder per purpose, each with a short system prompt, the rules (allowed actions, locator preference, "copy names exactly from the snapshot", "end every scenario with an assertion on the outcome", "use South African test data such as +27 cellphone numbers"), and the delimited untrusted page content.

---

## 8. Demo target: Kota Express

A small kota ordering site at `/demo-shop/[release]`, so the demo never depends on someone else's website. It has its own look (warm, simple, clearly a customer's app, not TestPilot). Prices in rand via `Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' })`.

Flow: menu, cart, checkout (name, cellphone, email, address, suburb), confirmation with an order number and delivery fee. The checkout form renders even with an empty cart (with a notice), so the explorer can see it. Each menu item is an `<article>` with the kota's name as its heading and its own "Add to order" button, so the agent has to scope with `within`, like it would on a real shop. No `data-testid` attributes: the agent must use what a user sees.

Releases come from typed config in `_config/releases.ts`. They share the same components and differ only by config: labels, layout variant and bug flags. No duplicated pages. Unknown releases return `notFound()`.

| Release | Behaviour | Expected agent result |
|---|---|---|
| `stable` | Everything works. | All scenarios pass, no healing. |
| `redesign` | Same behaviour; controls renamed ("Add to order" becomes "Add to bag", "Checkout" becomes "Proceed to payment", "Place order" becomes "Confirm order") and layout changed. Outcome text stays the same. | Passes with healed steps in "Needs review". |
| `buggy` | Seeded bugs, each behind a named flag: cart total ignores quantity; cellphone field accepts letters; confirmation shows the wrong delivery fee; "Specials" nav link returns 404. | Every seeded bug reported, no false failures. |

The bugs are wrong business logic written as clean code: no code smells and no security flaws, so SonarQube Cloud stays clean.

---

## 9. Design system

The team's references: an editorial fragrance site (big serif headlines, sage-paper background, deep green pill buttons), a friendly product site (mascot, lime call to action, numbered how-it-works), and a dark analytics dashboard from Mobbin with pastel stat cards, a "Choose platforms" onboarding step and a chat composer with suggestion cards. Take the ideas, not the assets: no copied logos, mascots, photos or copy.

**Concept: flight recorder.** TestPilot flies through the app, and each run is drawn as a flight path. Scenarios are routes, steps are waypoints: passed is a solid dot on the line, healed is a small detour loop above it, failed breaks the line, skipped is a hollow dot. This is the one memorable visual. Keep everything around it calm.

### Colour (Tailwind v4 `@theme` tokens)

| Token | Hex | Use |
|---|---|---|
| `paper` | `#EEF0EA` | Landing background, light surfaces |
| `ink` | `#151A17` | Text on light; dark-mode base |
| `forest` | `#123D33` | Primary buttons and links on light |
| `signal` | `#C8F25B` | One call to action per screen; the active waypoint |
| `sky` | `#BED5EF` | Pastel stat tile (passed) |
| `orchid` | `#E2B6E4` | Pastel stat tile (bugs) |

Dark dashboard surfaces: base `#141816`, raised `#1C211E`, divider `#2C332E`, control border `#66706A`, text `#E9EDE9`, muted `#9AA39D`. On light surfaces the control border is `#7D867F`.

Status (always icon plus word, never colour alone):

| Status | On dark | On light (landing, print) |
|---|---|---|
| Passed | `#2E9E6B` | `#1C7049` |
| Healed | `#D99A2B` | `#875A0B` |
| Failed | `#EC625A` | `#B3352D` |
| Skipped | `#8E9690` | `#5E6862` |

These pairs were checked for WCAG AA (4.5:1 for text, 3:1 for input borders and focus rings). Check any new pair the same way; adjust the shade, not the rule.

### Type

- **Instrument Serif** for headlines and big numbers. Its italic is reserved for the agent's own voice: narration lines in the agent feed. Don't italicise a single word in a headline for decoration.
- **Manrope** (400, 500, 600, 700) for UI and body text.
- **JetBrains Mono** only for real code: locators, URLs, logs. Not for labels.
- Load all three with `next/font/google` (self-hosted at build, no runtime requests).
- Scale in rem: 0.8125, 0.9375, 1, 1.25, 1.75, 2.5, 4, 5.5. Prose lines at most 75ch.

### Layout

Landing page (light, paper): left-aligned editorial hero. Headline, one plain sentence, "Run a test" (signal) and "See a sample report". On the right, a real recorded run replays as a flight path, using the same components and reducer as the dashboard, captioned with where and when it was recorded. A soft aurora gradient sits behind the hero only. Below: the four stages (Receives, Decides, Executes, Delivers; a real sequence, so numbering is fine), "What's real", the Kota Express teaser, footer.

New run (dark): two steps, like an onboarding flow.
1. "Choose a target": cards for Kota Express stable, redesign and buggy, plus "Your own URL" (disabled with an explanation unless `TARGET_MODE` allows it).
2. "What should I test?": a composer with four suggestion cards, for example "Order two kotas and check out", "Checkout rejects a bad cellphone number", "The confirmation shows the delivery fee", "Every navigation link works". Clicking a card fills the composer. Button: "Start run".

Live run (dark bento with hierarchy):

```
┌───────────┬──────────────────────────────────────────────────────────────┐
│ TestPilot │ Kota Express (buggy)  Running  0:21  LLM 2/12  Stop          │
│           ├──────────────────────────────────────────────────────────────┤
│ New run   │ Flight path: one row per scenario, a waypoint per step       │
│ History   ├────────────────────────────────────┬─────────────────────────┤
│           │ Live browser                       │ Passed 9 (sky)          │
│           │ latest screenshot, step caption,   │ Healed 2   Failed 1     │
│           │ scrub through earlier steps        │ Bugs 1 (orchid)         │
│           │                                    ├─────────────────────────┤
│           │                                    │ Agent feed              │
│           │                                    │ (italic serif voice)    │
│           ├────────────────────────────────────┴─────────────────────────┤
│           │ Tabs: Steps | Bugs | Needs review | Traceability | Export    │
└───────────┴──────────────────────────────────────────────────────────────┘
```

The live browser is the biggest tile. Radii follow hierarchy: outer panels 20px, inner cards 12px, chips fully rounded. Clicking a waypoint selects that step everywhere (browser tile, steps tab).

### Rules

- No ALL-CAPS eyebrow labels, no arrows glued to button text, no emoji in the UI, no strings of items joined with middle dots, no gradient washes except the hero aurora.
- Motion: one orchestrated moment (waypoints lighting up in sequence). Otherwise animate only in response to a user action or a new event. Respect `prefers-reduced-motion`.
- Copy: plain verbs, sentence case. Buttons say what happens ("Start run", "Download JUnit XML"), and the result echoes it ("Run started"). Errors say what happened and what to do next. Empty states invite the next action.
- No invented numbers anywhere. Stats come from real runs or don't appear.
- Accessibility: everything keyboard reachable; visible focus ring (signal on dark, forest on light); `aria-live="polite"` on the agent feed; each waypoint is a button with a label like "Step 4 of 9, click Proceed to payment, healed"; screenshots get alt text describing the step.
- Responsive down to 360px: the bento stacks, and the flight path scrolls sideways inside its own container.
- Mascot: our own simple geometric SVG (a small round bot in pilot goggles), three states: idle, flying, worried. Landing hero and empty states only.

---

## 10. How to work

1. Take the first unchecked task in `docs/ROADMAP.md`. One task at a time.
2. Think briefly about the design, then build it in small files that follow sections 3 to 6.
3. Write or update unit tests alongside the code, using the fakes in `tests/fakes`.
4. Run `npm run check` (lint, typecheck, tests). Fix everything before moving on.
5. Tick the box in `docs/ROADMAP.md`. If you made a decision worth remembering, add one line under the task.
6. Commit with Conventional Commits (`feat(agent): add rule-based healing strategy`), one logical change per commit.
7. Keep `README.md` true: when commands, env vars or features change, update it in the same commit.
8. If a rule here is wrong or blocks you, stop and say so with a suggested edit. Don't quietly work around it.
9. Stop and ask a human for: API keys, SonarQube Cloud settings, GitHub secrets, or anything destructive.

Never commit secrets, lower coverage thresholds, disable rules to get green, or fake data to make the UI look finished.

---

## 11. Scripts

| Script | Does |
|---|---|
| `npm run dev` | Next dev server on port 3000 |
| `npm run build` / `npm start` | Production build and server (use this for the demo) |
| `npm run lint` | `eslint .` |
| `npm run typecheck` | `next typegen && tsc --noEmit` |
| `npm test` | Unit tests |
| `npm run test:coverage` | Unit tests with lcov for SonarQube Cloud |
| `npm run test:integration` | Agent against Kota Express in real Chromium (replayed LLM) |
| `npm run check` | lint, typecheck, test |
| `npm run replays:record` | Run the demo stories live with `LLM_RECORD=true` |
| `npm run agent -- --url <url> --story "<text>"` | CLI run, writes JUnit and Markdown to `./reports` |
| `npm run format` | Prettier |
