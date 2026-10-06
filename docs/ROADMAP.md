# Roadmap

Deadlines from the Sebaka deck: **repo submitted Wed 7 Oct 2026**, **live demo Sat 10 Oct 2026** (5 minutes, no code walkthrough).

Rules for this plan:
- The app must be demoable at the end of every phase.
- One task at a time, in order. Tick the box when `npm run check` passes and the task is committed.
- Short on time? Use the cut list at the bottom. Never cut real browser runs, tests or the security basics.
- Tasks marked **HUMAN** need a person (keys, accounts, secrets). Claude Code stops and asks.

---

## Phase 0: Reset and foundations (Tue 6 Oct)

Goal: an empty but production-shaped repo, green CI, SonarQube Cloud connected.

- [x] Tag the old prototype so it stays recoverable: `git tag v0-prototype && git push origin v0-prototype`. Then delete `TestPilot AI.html`, `app.js` and `style.css` from `main`.
- [x] Scaffold Next.js 16 (TypeScript, ESLint, Tailwind, App Router, `src/` directory, import alias `@/*`) in a temporary folder with `npx create-next-app@latest`, then move its files into the repo root. Keep our `CLAUDE.md`, `README.md` and `docs/`. (create-next-app refuses to scaffold into a folder that already has these files.)
- [x] Install runtime packages: `playwright ai @ai-sdk/google @ai-sdk/anthropic @ai-sdk/openai zod ipaddr.js server-only class-variance-authority clsx tailwind-merge lucide-react motion`. Dev packages: `vitest @vitest/coverage-v8 typescript-eslint eslint-plugin-sonarjs prettier tsx`. Then `npx shadcn@latest init` and `npx playwright install chromium`.
  - shadcn init added an unvetted `cn` npm package; we use our own `src/lib/cn.ts` (clsx plus tailwind-merge) instead. Next 16 already treats `playwright` as a server external package.
- [x] `tsconfig.json`: `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`.
- [x] `eslint.config.mjs`: Next config, `typescript-eslint` type-checked rules, `eslint-plugin-sonarjs` recommended, `no-floating-promises`, `no-explicit-any`, and `no-restricted-imports` boundaries (CLAUDE.md section 3) for `src/core/**`, `src/components/**` and `src/hooks/**`.
  - Explicit return types are enforced on `src/**/*.ts`; React components (`.tsx`) infer theirs.
- [x] Prettier config and the scripts from CLAUDE.md section 11 (`check` must exist from day one).
  - `package.json` has `"type": "module"`. `agent` and `replays:record` scripts land with Phase 5 and Phase 2.
- [x] `vitest.config.ts`: `tests/unit` and `tests/integration` as separate projects; v8 coverage with `text` and `lcov` reporters to `coverage/lcov.info`; 80% thresholds on `src/core`, `src/adapters`, `src/server`, `src/contracts`, `src/lib`; alias `server-only` to an empty module. The integration project gets a `globalSetup` that reuses a running app at `INTEGRATION_BASE_URL` or builds and starts one on a spare port.
- [x] `src/server/env.ts` (`parseEnv` and lazy `getEnv`, provider-specific required keys via `superRefine`), `.env.example` (below), `.gitignore` for `.env*` (except `.env.example`), `.data/`, `coverage/`, `reports/`, `test-results/`.
  - Defaults to `LLM_PROVIDER=replay` when unset, so a fresh clone starts without keys. Blank values count as unset. Added `LLM_REPLAY_DIR` and `DATA_DIR` with defaults.
- [x] `next.config.ts`: security headers (CLAUDE.md section 4, item 12). Add `serverExternalPackages: ['playwright']` only if bundling complains.
  - Headers come from `src/server/security/securityHeaders.ts` (unit-tested). No `upgrade-insecure-requests` or HSTS because the demo runs on plain-HTTP localhost.
- [ ] `.github/workflows/ci.yml` and `sonar-project.properties` (below), `.github/dependabot.yml` for `npm` and `github-actions`, weekly.
- [ ] **HUMAN (repo owner):** sign in to sonarcloud.io with GitHub, import the repo, set **Administration > Analysis Method > Automatic Analysis: off**, generate a token, add it as the GitHub secret `SONAR_TOKEN`, then copy the organization and project keys into `sonar-project.properties`.
- [ ] **HUMAN:** create an API key (Google AI Studio for Gemini, or Anthropic/OpenAI), pick a current model ID, put both in `.env.local`. Never commit it.
- [ ] After the first green scan, add the quality gate, coverage and security rating badges to the top of `README.md`.

Done when: `npm run check` and `npm run build` pass locally, and the CI run on `main` is green with an analysis visible in SonarQube Cloud.

### `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

permissions:
  contents: read

jobs:
  quality:
    runs-on: ubuntu-latest
    env:
      LLM_PROVIDER: replay # build and unit tests need no API keys
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0 # SonarQube Cloud needs full history
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test:coverage
      - run: npm run build
      - name: SonarQube Cloud scan
        uses: SonarSource/sonarqube-scan-action@v7
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
      - run: npm audit --omit=dev --audit-level=high
```

### `sonar-project.properties`

```properties
# Copy both keys from SonarQube Cloud > project > Information. These are the usual defaults.
sonar.organization=phathutshedzopr
sonar.projectKey=PhathutshedzoPR_AI-Agent-Functional-testing
sonar.projectName=TestPilot

sonar.sources=src
sonar.tests=tests
sonar.exclusions=**/*.d.ts
sonar.javascript.lcov.reportPaths=coverage/lcov.info

# Excluded from coverage only (still analysed for issues):
# src/app, src/components, src/hooks: pages, thin route handlers, presentational components
# src/server/container.ts: wiring only
# Playwright browser adapter: covered by tests/integration in real Chromium
sonar.coverage.exclusions=src/app/**,src/components/**,src/hooks/**,src/server/container.ts,src/adapters/browser/PlaywrightBrowser*.ts
```

If SonarQube Cloud reports Tailwind v4 at-rules (`@theme`, `@custom-variant`, `@utility`) as unknown under `css:S4662`, ignore that one rule for `src/app/globals.css` only:

```properties
sonar.issue.ignore.multicriteria=tw
sonar.issue.ignore.multicriteria.tw.ruleKey=css:S4662
sonar.issue.ignore.multicriteria.tw.resourceKey=src/app/globals.css
```

### `.env.example`

```bash
# Copy to .env.local and fill in. Never commit .env.local.

# google | anthropic | openai | replay
LLM_PROVIDER=google
# A current model ID from your provider console (for Gemini, pick a Flash model in AI Studio)
LLM_MODEL=
# true saves every LLM response to fixtures/llm-replays
LLM_RECORD=false
GOOGLE_GENERATIVE_AI_API_KEY=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=

APP_BASE_URL=http://localhost:3000
# allowlist | public
TARGET_MODE=allowlist
TARGET_ALLOWLIST=localhost:3000

AGENT_MAX_PAGES=5
AGENT_MAX_SCENARIOS=4
AGENT_MAX_STEPS=12
AGENT_MAX_LLM_CALLS=12
AGENT_STEP_TIMEOUT_MS=5000
AGENT_RUN_TIMEOUT_MS=180000
AGENT_HEAL_MIN_CONFIDENCE=0.7
AGENT_SNAPSHOT_MAX_CHARS=12000
AGENT_HEADLESS=true
# e.g. 250 with AGENT_HEADLESS=false to watch the real browser on stage
AGENT_SLOW_MO_MS=0

RATE_LIMIT_RUNS_PER_MINUTE=5
```

---

## Phase 1: Core and a real browser (Tue 6 Oct)

Goal: a hand-written plan runs against Kota Express in real Chromium. No LLM yet.

- [ ] Domain in `src/core/domain`: `Locator`, `PlanStep`, `Scenario`, `TestPlan`, `StepResult`, `Healing`, `Finding`, `BugReport`, `TestRun`, `RunEvent` (Zod schemas plus `z.infer` types, `create()` factories that guard invariants). Unit tests.
- [ ] Ports in `src/core/ports` (CLAUDE.md section 3) and the error hierarchy in `src/core/errors`.
- [ ] Actions: `IStepAction`, one class per action (CLAUDE.md section 6), `ActionRegistry`, `StepFactory`. Unit tests with `FakeBrowserSession`, including `assertText` whitespace and rand-amount matching.
- [ ] `TargetUrlGuard` implementing `ITargetPolicy`. Tests must reject: `file:`, `javascript:` and `data:` schemes, credentials in the URL, loopback, private, link-local and cloud-metadata addresses in public mode, IPv4-mapped IPv6, hosts outside the allowlist in allowlist mode, and a redirect to a blocked host.
- [ ] Playwright adapter: `PlaywrightBrowserFactory` (one browser per run, fresh context per scenario), `PlaywrightBrowserSession` (open, ariaSnapshot, act, screenshot, current URL, findings from console errors and failed responses, `page.route()` guard that also blocks TestPilot's own `/api/*`), `LocatorResolver` (Locator to `getBy*`, including `within`). Unit-test the resolver mapping.
- [ ] `src/adapters/system`: `SystemClock`, `CryptoIdGenerator`.
- [ ] Kota Express at `/demo-shop/[release]` with `stable`, `redesign` and `buggy` exactly as in CLAUDE.md section 8. Same components for every release; differences only in `_config/releases.ts`.
- [ ] Integration test: a hand-written plan ("add two Quarter kotas, check the cart total, check out with valid details, see the confirmation") passes on `stable` and fails on `buggy` at the cart total, with real screenshots written to `.data/artifacts`.

Done when: that integration test passes locally.

---

## Phase 2: The agent loop and a working UI (Tue 6 to Wed 7 Oct)

Goal: from the browser, start a run on Kota Express and watch real steps stream in.

- [ ] `createLanguageModel(env)` and `AiSdkLanguageModel` (`generateText` with `Output.object`, error mapping, one retry on 429/5xx). Unit tests with the AI SDK's mock model from `ai/test`.
- [ ] `RecordingLanguageModel` (Decorator) and `ReplayLanguageModel`. Unit tests.
- [ ] Prompt builders in `src/core/prompts` for plan, heal and report wording, each with its Zod output schema. Snapshot-test the built prompts so changes show up in review.
- [ ] `SiteExplorer`: same-origin crawl under the start URL's path, up to `AGENT_MAX_PAGES`, aria snapshot per page, failed links recorded as findings.
- [ ] `TestPlanner`: story optional. With acceptance criteria, map each scenario to one (`criterion`). Without, propose criteria and label them "inferred". Invalid steps become warnings.
- [ ] `ScenarioExecutor`: runs steps through `ActionRegistry`, emits events, screenshots every step, skips the rest of a scenario after a failure. No healing yet.
- [ ] `BugReporter` with template wording.
- [ ] `TestAgent` (Template Method), `RunService` and `RunQueue`: one run at a time, every per-run limit from env, cancel through an `AbortController`, browser closed in `finally`.
- [ ] `InMemoryRunRepository`, `FileArtifactStore`, `InMemoryEventBus`.
- [ ] `projectRun` reducer (events to view state) with thorough unit tests. The UI depends on it.
- [ ] `src/contracts` schemas, `withApiHandler`, `assertSameOrigin`, `RateLimiter`, `sseResponse`, and every route in CLAUDE.md section 3. Unit-test `withApiHandler` and the limiter.
- [ ] `useRunStream` hook. Plain but working pages: `/runs/new` (target picker and story box) and `/runs/[runId]` (steps with status, screenshots, bugs). Styling comes in Phase 4.
- [ ] **HUMAN plus Claude:** run `npm run replays:record` for the four suggestion stories on all three releases, and commit `fixtures/llm-replays`.

Done when: on `stable` a run streams steps with real screenshots and passes; on `buggy` it reports at least the cart-total bug. Also works with `LLM_PROVIDER=replay`.

---

## Submission checkpoint (Wed 7 Oct)

Confirm the exact cut-off time with Sebaka, and ask a mentor whether commits after 7 Oct count. Aim to be ready by 17:00.

- [ ] `README.md` matches what exists: commands, env vars, a real screenshot of a run (save to `docs/images/`), the team section filled in.
- [ ] CI green on `main`. Quality gate passing, or the remaining issues listed honestly in the README.
- [ ] `git tag submission-2026-10-07 && git push origin submission-2026-10-07`, then submit the repo link through Sebaka's form.

---

## Phase 3: Self-healing, reports and exports (Thu 8 Oct)

Goal: the redesign release passes by healing, and every run produces artefacts a QA team would keep.

- [ ] Healing strategies in `src/core/agent/healing` (same role with similar name, then label, placeholder, text), then the LLM heal, confidence threshold, single retry, `Healing` record, "Needs review" list. Unit tests per strategy.
- [ ] Integration test: `redesign` passes with healed steps and no failures.
- [ ] Batched wording call for bug titles and summaries, with the template fallback.
- [ ] **HUMAN plus Claude:** re-run `npm run replays:record` (heal and wording calls are new) and commit the fixtures.
- [ ] Exporters behind `IReportExporter` plus `ExporterRegistry`: JSON, JUnit XML, Markdown (one GitHub-issue-ready section per bug) and Playwright spec. Wire up `/api/runs/[runId]/export/[format]`.
- [ ] Test that proves the exported spec is real: export a passing `stable` run, run it with `npx playwright test` (add `@playwright/test` as a dev dependency) and expect it to pass.
- [ ] Traceability: parse criteria from the story (bullets, numbered lines, Given/When/Then), keep criterion, scenarios and result together in the run view.
- [ ] Agent scorecard: `tests/integration/scorecard.test.ts` runs the suggestion stories on all three releases and asserts: no failures on `stable`; passes with at least one heal on `redesign`; every seeded bug found on `buggy`, with no other failures. Print a Markdown table and paste the real numbers into the README.

Done when: the scorecard test passes in replay mode and the README shows its real numbers.

---

## Phase 4: Interface (Thu 8 to Fri 9 Oct)

Goal: the design in CLAUDE.md section 9, wired to real data.

- [ ] Tokens in `globals.css`, fonts through `next/font`, primitives in `components/ui` (cva variants), light and dark.
- [ ] Brand: `Logo`, `Mascot` (idle, flying, worried).
- [ ] `FlightPath` and `Waypoint`: one row per scenario, solid, detour, break and hollow states, keyboard focus and labels, reduced-motion fallback.
- [ ] New run: "Choose a target" cards, then "What should I test?" composer with four suggestion cards. Clicking a card fills the composer; "Start run" starts it.
- [ ] Live run dashboard: header (target, status, elapsed, LLM calls, "Stop run"), flight path, live browser tile with scrubber, stat tiles, agent feed with `aria-live`.
- [ ] Tabs: Steps, Bugs (evidence, expected vs actual), Needs review (healed steps with from, to and reason), Traceability, Export. A print stylesheet so "Save as PDF" from the browser gives a clean report.
- [ ] History page.
- [ ] Landing page. Record one real run's events to `src/app/(marketing)/_data/sample-run.json` and replay them through `projectRun` in the hero, captioned with where and when it was recorded.
- [ ] Empty, loading and error states. Check at 360px, keyboard only, and with a screen reader. Lighthouse accessibility at least 95 on the landing and run pages.
- [ ] Smoke check: point TestPilot at its own landing page and fix anything it finds.

Done when: a full run looks right on a projector-sized screen and on a phone.

---

## Phase 5: Hardening and proof (Fri 9 Oct, morning)

- [ ] Walk CLAUDE.md section 4 item by item. Add a test for each guard that doesn't have one yet.
- [ ] SonarQube Cloud: 0 bugs, 0 vulnerabilities, code smells fixed, duplication under 3%, coverage at least 80% on new code. **HUMAN:** review each security hotspot in the SonarQube Cloud UI and mark it Safe with a reason, or fix it.
- [ ] CI job `integration`: `npx playwright install --with-deps chromium`, build, start the app, run `npm run test:integration` with `LLM_PROVIDER=replay`.
- [ ] CLI `scripts/run-agent.ts` using `createContainer`: `npm run agent -- --url <url> --story "<text>"` writes JUnit and Markdown to `./reports` and exits non-zero on failures. This proves the core runs outside Next.
- [ ] Final README pass: setup works from a clean clone on Windows and macOS or Linux.

---

## Phase 6: Demo readiness (Fri 9 Oct, afternoon)

- [ ] Feature freeze at 16:00. Only bug fixes after that.
- [ ] Demo settings: `AGENT_MAX_SCENARIOS=3`, every run under about 40 seconds. Do a warm-up run before going on stage.
- [ ] Offline drill: Wi-Fi off, `LLM_PROVIDER=replay`, the whole script still works.
- [ ] Record a backup screen capture of the full demo. Keep it on the laptop and a USB stick.
- [ ] Rehearse three times with a timer. One person drives, one person talks.
- [ ] Laptop: `npm run build && npm start`, notifications off, other apps closed, browser zoom 125%, charger packed, second laptop set up the same way.

### Demo script (5 minutes, all live)

| Time | Show | Say |
|---|---|---|
| 0:00 to 0:30 | Landing page | Who has the problem: small teams test checkout by hand before every release, and their test scripts break whenever a button is renamed. |
| 0:30 to 1:30 | New run on Kota Express `stable`, click "Order two kotas and check out", "Start run" | The agent receives a URL and a story, decides what to test, and executes it in a real browser. Point at the plan appearing and real screenshots arriving. Optional: run headed with slow-mo so the room sees Chromium move. |
| 1:30 to 2:45 | Same story on `redesign` | The developers renamed the buttons. A normal script would break here. Watch the detours: healed steps, each listed under "Needs review" with what changed. |
| 2:45 to 4:00 | Same story on `buggy`, open the bug | A real bug: two kotas, but the total charges for one. Expected vs actual, steps to reproduce, the screenshot. Download JUnit and the Playwright spec: the team keeps the test. |
| 4:00 to 4:40 | README scorecard and SonarQube Cloud badges | How we know it works: every seeded bug caught, no false failures on the stable release. The LLM proposes, Playwright decides, so a result on screen actually happened. |
| 4:40 to 5:00 | Back to the dashboard | Who it's for and what's next (CI runs on every pull request, more targets). |

---

## Cut list (cut from the top when behind)

1. CLI
2. History page
3. Markdown export
4. Traceability tab
5. Landing page flight-path animation (use a static screenshot of a real run)
6. CI integration job (run it locally instead)

Never cut: real browser execution, healing on `redesign`, bug reports on `buggy`, unit tests, the security rules, the README.
