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
- [x] `.github/workflows/ci.yml` and `sonar-project.properties` (below), `.github/dependabot.yml` for `npm` and `github-actions`, weekly.
  - Actions pinned to current majors (checkout v7, setup-node v7, sonarqube-scan-action v8). The scan step is skipped until `SONAR_TOKEN` exists, so CI can go green first.
- [x] **HUMAN (repo owner):** sign in to sonarcloud.io with GitHub, import the repo, set **Administration > Analysis Method > Automatic Analysis: off**, generate a token, add it as the GitHub secret `SONAR_TOKEN`, then copy the organization and project keys into `sonar-project.properties`.
- [x] **HUMAN:** create an API key (Google AI Studio for Gemini, or Anthropic/OpenAI), pick a current model ID, put both in `.env.local`. Never commit it.
- [x] After the first green scan, add the quality gate, coverage and security rating badges to the top of `README.md`.
  - CI, quality gate, coverage and security rating badges at the top of the README; the gate passes from 09ddee5.

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

- [x] Domain in `src/core/domain`: `Locator`, `PlanStep`, `Scenario`, `TestPlan`, `StepResult`, `Healing`, `Finding`, `BugReport`, `TestRun`, `RunEvent` (Zod schemas plus `z.infer` types, `create()` factories that guard invariants). Unit tests.
  - Domain types are plain data (Zod schema plus `z.infer`) with a same-named companion object holding `create()`, so they serialise over SSE unchanged. Text and rand-amount matching lives in `textMatching.ts`. Added an `llm.called` event so the UI can show LLM calls used.
- [x] Ports in `src/core/ports` (CLAUDE.md section 3) and the error hierarchy in `src/core/errors`.
  - Added `IBrowser` (one per run) between `IBrowserFactory` and `IBrowserSession` (one per scenario). `IReportExporter` lands with the exporters in Phase 3, once the run view type exists.
- [x] Actions: `IStepAction`, one class per action (CLAUDE.md section 6), `ActionRegistry`, `StepFactory`. Unit tests with `FakeBrowserSession`, including `assertText` whitespace and rand-amount matching.
  - Each action declares its own target/value rules, and StepFactory reads them, so the action table has one source. Extra operands are dropped silently; a missing required one rejects the step. `press` takes keys from an allowlist only. Failed checks throw `AssertionFailedError` (expected vs actual).
- [x] `TargetUrlGuard` implementing `ITargetPolicy`. Tests must reject: `file:`, `javascript:` and `data:` schemes, credentials in the URL, loopback, private, link-local and cloud-metadata addresses in public mode, IPv4-mapped IPv6, hosts outside the allowlist in allowlist mode, and a redirect to a blocked host.
  - The guard also blocks TestPilot's own `/api/*`, so both the start URL and every browser request go through one tested check. Tests turn off `sonarjs/no-hardcoded-ip` for `tests/**` only (needs team sign-off).
- [x] Playwright adapter: `PlaywrightBrowserFactory` (one browser per run, fresh context per scenario), `PlaywrightBrowserSession` (open, ariaSnapshot, act, screenshot, current URL, findings from console errors and failed responses, `page.route()` guard that also blocks TestPilot's own `/api/*`), `LocatorResolver` (Locator to `getBy*`, including `within`). Unit-test the resolver mapping.
  - Playwright only routes the first hop of a redirect, so `PlaywrightRequestGuard` fetches each request with `maxRedirects: 0` and checks every `Location` before fulfilling. WebSockets are checked too. Blocked requests become `blocked-request` findings. Coverage exclusion widened to `src/adapters/browser/Playwright*.ts` (integration-tested).
- [x] `src/adapters/system`: `SystemClock`, `CryptoIdGenerator`.
- [x] Kota Express at `/demo-shop/[release]` with `stable`, `redesign` and `buggy` exactly as in CLAUDE.md section 8. Same components for every release; differences only in `_config/releases.ts`.
  - Cart and order live in sessionStorage (fresh per scenario context). Buttons stay disabled until hydration so early clicks are never lost. Line items show "2 × R 35,00" and only the total shows the sum, so a whole-page total check is unambiguous. Bugs: cart total ignores quantity, cellphone check is length-only, confirmation shows the express fee (R 45) instead of the R 30 charged, Specials page calls `notFound()`. All shop colour pairs pass AA.
- [x] Integration test: a hand-written plan ("add two Quarter kotas, check the cart total, check out with valid details, see the confirmation") passes on `stable` and fails on `buggy` at the cart total, with real screenshots written to `.data/artifacts`.
  - Passes against both `npm run dev` and a production build. Chromium runs with `--disable-features=LocalNetworkAccessChecks`: the guard fulfils every page, so Chrome otherwise blocks the page's WebSockets (and Turbopack dev never hydrates) before our own WebSocket check runs. `FileArtifactStore` landed early for the screenshots.

Done when: that integration test passes locally.

---

## Phase 2: The agent loop and a working UI (Tue 6 to Wed 7 Oct)

Goal: from the browser, start a run on Kota Express and watch real steps stream in.

- [x] `createLanguageModel(env)` and `AiSdkLanguageModel` (`generateText` with `Output.object`, error mapping, one retry on 429/5xx). Unit tests with the AI SDK's mock model from `ai/test`.
  - AI SDK v7 names the system prompt `instructions` and retries 429/5xx itself, so `maxRetries: 1` gives the single backoff retry. Unit tests use `MockLanguageModelV4` from `ai/test`.
- [x] `RecordingLanguageModel` (Decorator) and `ReplayLanguageModel`. Unit tests.
  - Replay keys hash purpose, system prompt and prompt (not just purpose and prompt), so a changed system prompt also forces a re-record. Fixtures store the full prompt for review.
- [x] Prompt builders in `src/core/prompts` for plan, heal and report wording, each with its Zod output schema. Snapshot-test the built prompts so changes show up in review.
  - Prompts show site paths, never host or port, so replay keys match on any machine (the integration app runs on a random port). Length limits moved from the Locator and PlanStep schemas into `create()`, because some providers reject `maxLength` in structured-output schemas.
- [x] `SiteExplorer`: same-origin crawl under the start URL's path, up to `AGENT_MAX_PAGES`, aria snapshot per page, failed links recorded as findings.
  - Snapshots wait for network idle and two identical reads, so a hydrating page always gives the same prompt. The cart always shows its checkout link and renders the empty cart on the server, so the explorer reaches checkout. `devIndicators: false` keeps dev and production snapshots identical.
- [x] `TestPlanner`: story optional. With acceptance criteria, map each scenario to one (`criterion`). Without, propose criteria and label them "inferred". Invalid steps become warnings.
  - Criteria come from bullets, numbered lines or Given/When/Then blocks in the story (`parseCriteria`). A scenario that does not start with `navigate` gets one to the start page, because every scenario opens a fresh browser.
- [x] `ScenarioExecutor`: runs steps through `ActionRegistry`, emits events, screenshots every step, skips the rest of a scenario after a failure. No healing yet.
  - Has an `IStepRepairer` hook (null for now) so Phase 3 healing plugs in without touching the loop: one repair, one retry. Cancellation (stop or timeout) surfaces as `RunCancelledError`, not as a failed step.
- [x] `BugReporter` with template wording.
  - Steps to reproduce come from `describeStep` in the domain, which the UI reuses for captions.
- [x] `TestAgent` (Template Method), `RunService` and `RunQueue`: one run at a time, every per-run limit from env, cancel through an `AbortController`, browser closed in `finally`.
  - Added `reusePlanFrom`: a run can re-run an earlier run's plan, rebased onto a new start page (`rebasePlan`). Without it the redesign release never heals, because a fresh plan reads the new button names. `BudgetedLanguageModel` (Decorator) enforces `AGENT_MAX_LLM_CALLS` and emits `llm.called`.
- [x] `InMemoryRunRepository`, `FileArtifactStore`, `InMemoryEventBus`.
  - The repository keeps at most 100 runs and evicts the oldest finished ones first. The bus drops a subscriber that throws (a closed stream) and keeps delivering to the rest.
- [x] `projectRun` reducer (events to view state) with thorough unit tests. The UI depends on it.
  - One handler per event type keeps the reducer flat. It also derives the agent feed (`narrateEvent`) from events, so narration never invents numbers. Events at or below the last seen `seq` are ignored, which makes SSE reconnects safe.
- [x] `src/contracts` schemas, `withApiHandler`, `assertSameOrigin`, `RateLimiter`, `sseResponse`, and every route in CLAUDE.md section 3. Unit-test `withApiHandler` and the limiter.
  - `defineApiHandler` takes its container and logger as arguments, so it is unit-tested without Next; `src/server/api.ts` binds it to the real container. The SSE route honours `Last-Event-ID` on reconnect. Same-origin checks compare against `APP_BASE_URL`, so open the app on that exact origin (localhost, not 127.0.0.1).
- [x] `useRunStream` hook. Plain but working pages: `/runs/new` (target picker and story box) and `/runs/[runId]` (steps with status, screenshots, bugs). Styling comes in Phase 4.
  - Fonts (Instrument Serif, Manrope, JetBrains Mono) are loaded with `next/font`. A finished run offers "Run this plan on" the other releases, which is the healing demo. Screenshots use `next/image` with `unoptimized` rather than disabling the `no-img-element` rule.
- [x] **HUMAN plus Claude:** run `npm run replays:record` for the four suggestion stories on all three releases, and commit `fixtures/llm-replays`.
  - Recorded live with gemini-3.5-flash for the "order two kotas" story on all three releases (LLM_RECORD=true and a live run). The other three suggestion stories are not recorded yet. Heal replays fall back to a recording for the same step, broken locator and page when live page details shift.

Done when: on `stable` a run streams steps with real screenshots and passes; on `buggy` it reports at least the cart-total bug. Also works with `LLM_PROVIDER=replay`.

---

## Submission checkpoint (Wed 7 Oct)

Confirm the exact cut-off time with Sebaka, and ask a mentor whether commits after 7 Oct count. Aim to be ready by 17:00.

- [x] `README.md` matches what exists: commands, env vars, a real screenshot of a run (save to `docs/images/`), the team section filled in.
  - Team names and roles in their own "Team" section.
- [x] CI green on `main`. Quality gate passing, or the remaining issues listed honestly in the README.
  - Green from commit 415b182: lint, typecheck, unit tests with the coverage gate, build, SonarQube Cloud scan and npm audit.
  - The gate then failed on one reliability bug (S7727, a function passed straight to `reduce`); fixed in 09ddee5.
- [x] **HUMAN:** rotate the Gemini API key. It was pasted into chat sessions and sat in an unpushed commit before it was scrubbed. Create a new key in AI Studio, put it in `.env.local` only, then delete the old key.
  - Rotated by the team on 7 Oct; the new key lives only in `.env.local`.
- [x] **HUMAN:** Dependabot's pull requests were opened before the lockfile fix, so their CI fails. Comment `@dependabot recreate` on each, then merge the ones that go green.
  - All three merged by the team on 7 Oct (React 19.3, ESLint 10, `@types/node` 26). Lint, typecheck, unit and integration tests pass on the merged versions.
- [x] `git tag submission-2026-10-07 && git push origin submission-2026-10-07`, then submit the repo link through Sebaka's form.

---

## Phase 3: Self-healing, reports and exports (Thu 8 Oct)

Goal: the redesign release passes by healing, and every run produces artefacts a QA team would keep.

- [x] Healing strategies in `src/core/agent/healing` (same role with similar name, then label, placeholder, text), then the LLM heal, confidence threshold, single retry, `Healing` record, "Needs review" list. Unit tests per strategy.
  - Rules need a name similarity of at least 0.5 (word overlap, or one name containing the other), so "Add to order" heals to "Add to bag" by rule, while "Checkout" and "Place order" go to the LLM. Rules never cross roles, so "Remove one" can never stand in for "Add one more".
- [x] Integration test: `redesign` passes with healed steps and no failures.
  - The plan comes from the stable run (`reusePlanFrom`); the test scripts the model's two heal suggestions, and finding exactly one element and retrying run in real Chromium.
- [x] Batched wording call for bug titles and summaries, with the template fallback.
  - The prompt uses positional ids (bug-1, bug-2), not UUIDs, so its replay key is stable. `plan.ready` now carries the criteria list (from the story, or proposed by the planner) for traceability.
- [x] **HUMAN plus Claude:** re-run `npm run replays:record` (heal and wording calls are new) and commit the fixtures.
  - Done together with the Phase 2 recordings.
- [x] Exporters behind `IReportExporter` plus `ExporterRegistry`: JSON, JUnit XML, Markdown (one GitHub-issue-ready section per bug) and Playwright spec. Wire up `/api/runs/[runId]/export/[format]`.
  - The spec exporter reuses `toLocatorCalls`, so exported tests use the same locator chain the agent ran, with healed locators where a step healed. Text checks become case-insensitive regexes that accept any whitespace and any rand format, matching the agent's own rules. Strings go through `JSON.stringify`; comments are stripped of every JS line terminator, including U+2028 and U+2029.
- [x] Test that proves the exported spec is real: export a passing `stable` run, run it with `npx playwright test` (add `@playwright/test` as a dev dependency) and expect it to pass.
  - Exported text checks allow zero whitespace between words, because Playwright reads `textContent`, where adjacent elements touch ("TotalR 70,00").
- [x] Traceability: parse criteria from the story (bullets, numbered lines, Given/When/Then), keep criterion, scenarios and result together in the run view.
  - traceCriteria (core/domain) joins criteria to scenarios by normalised text and takes the worst result; untested criteria stay visible. Shown in a Traceability tab and the Markdown report.
- [x] Agent scorecard: `tests/integration/scorecard.test.ts` runs the suggestion stories on all three releases and asserts: no failures on `stable`; passes with at least one heal on `redesign`; every seeded bug found on `buggy`, with no other failures. Print a Markdown table and paste the real numbers into the README.
  - 9 Oct: all four stories on stable, redesign (old plan and planned fresh) and buggy, from recordings: every seeded bug caught (cart total, cellphone letters, delivery fee, Specials 404), no false failures. Two agent fixes came out of it: URL checks now move with a re-run plan, and a step that lands on a missing page fails even when a single-page app answered 200.
  - Written and passing in replay for "Order two kotas" and "Delivery fee" (both catch their seeded bug, plus the Specials 404; README has the numbers). Each buggy plan is re-run on stable to prove its failure comes from the seeded bug. Cellphone and navigation stories are `it.todo` until recorded. A planner rule now lets plans check values carried over from seen pages (the delivery fee) on pages the explorer never saw, which is how the fee bug gets caught.

Done when: the scorecard test passes in replay mode and the README shows its real numbers.

---

## Phase 4: Interface (Thu 8 to Fri 9 Oct)

Goal: the design in CLAUDE.md section 9, wired to real data.

- [x] Tokens in `globals.css`, fonts through `next/font`, primitives in `components/ui` (cva variants), light and dark.
  - Tokens and next/font were in place; buttons now share one cva definition (components/ui/buttonStyles.ts: signal, forest and outline tones on light or dark surfaces, 44px tall, focus ring per surface) instead of six copied class strings. The unused stock shadcn button and @base-ui/react are gone.
- [x] Brand: `Logo`, `Mascot` (idle, flying, worried).
- [x] `FlightPath` and `Waypoint`: one row per scenario, solid, detour, break and hollow states, keyboard focus and labels, reduced-motion fallback.
  - Renames found by healing now carry through the rest of the run, so checks on a renamed control test the new control.
- [x] New run: "Choose a target" cards, then "What should I test?" composer with four suggestion cards. Clicking a card fills the composer; "Start run" starts it.
- [x] Live run dashboard: header (target, status, elapsed, LLM calls, "Stop run"), flight path, live browser tile with scrubber, stat tiles, agent feed with `aria-live`.
- [x] Tabs: Steps, Bugs (evidence, expected vs actual), Needs review (healed steps with from, to and reason), Traceability, Export. A print stylesheet so "Save as PDF" from the browser gives a clean report.
  - Print (Save as PDF) gives a light report with every panel (steps, bugs with screenshot, needs review, traceability) and no navigation, buttons or export links: the dark tokens switch to light ones in @media print, and inactive panels use the hidden class rather than the hidden attribute, which Tailwind forces off even in print.
- [x] History page.
- [x] Landing page. Record one real run's events to `src/app/(marketing)/_data/sample-run.json` and replay them through `projectRun` in the hero, captioned with where and when it was recorded.
  - The hero replays a real recorded stable run (`src/app/(marketing)/_data/sample-run.json`); only its label was set to the dashboard name.
- [x] Empty, loading and error states. Check at 360px, keyboard only, and with a screen reader. Lighthouse accessibility at least 95 on the landing and run pages.
  - tests/integration/accessibility.test.ts runs axe-core (Lighthouse's accessibility engine) with WCAG 2.1 AA and best-practice rules on landing, new run, history, a finished run and both not-found pages, at 1280px and 360px: zero violations (it found two scroll areas keyboards could not reach; fixed). A keyboard-only pass starts a run and selects a waypoint with a visible focus ring at every stop. New states: our own 404, a run-not-found page that explains runs vanish on restart (it used to say the connection was lost), and a dashboard error page with Try again.
- [ ] **HUMAN:** listen to one run with NVDA (free on Windows): the agent feed should be read out as it arrives, and each waypoint should announce its step and status.
- [x] Smoke check: point TestPilot at its own landing page and fix anything it finds.
  - 9 Oct, planned live by NVIDIA's Kimi K3: TestPilot explored its own landing, history, new run and shop pages, planned 4 scenarios from a visitor's story, and all 20 steps passed in 52 s with no console errors, broken links or bugs.
- [x] The application should be mobile friendly. TestPilot's own pages work on a phone at 360px and 390px: the sidebar becomes a top bar, the bento stacks in reading order (header, flight path, live browser, stats, feed, tabs), the flight path scrolls sideways inside its own container, tap targets are at least 44px, and the page never scrolls sideways. Check landing, new run, live run and history with Playwright's `iPhone 13` and `Pixel 7` profiles.
  - Checked on Pixel 7, iPhone 13 and 360px: no page scrolls sideways; the landing hero no longer clips (grid columns use minmax(0, ...)); step rows put the duration under the step; nav links and touch waypoints are 44px. The Kota Express shop keeps its own small links, because changing its pages would invalidate the recorded replays.
- [x] Test on phones, step 1 (mobile web): a "Device" choice on the new run page (Desktop, iPhone, Android) runs every scenario in a Playwright device profile (viewport, touch, user agent). The run header shows the device, and the exported spec carries it (`test.use({ ...devices['Pixel 7'] })`). Still a real browser and real verdicts; no new dependencies.
  - Runs carry a device (desktop, iphone, android) from the request to run.started, the view and the exports. Phones use Playwright's iPhone 15 and Pixel 7 profiles (screen, touch, user agent) in Chromium. New run has a Which screen? choice, the header shows the screen, and Or on another screen re-runs a finished plan on a phone with no model calls. The integration test re-runs the stable plan on Android in real Chromium and runs its exported spec (devices['Pixel 7'] on Chromium) with npx playwright test: both pass.

Done when: a full run looks right on a projector-sized screen and on a phone.

---

## Phase 5: Hardening and proof (Fri 9 Oct, morning)

- [x] Walk CLAUDE.md section 4 item by item. Add a test for each guard that doesn't have one yet.
  - Every rule has a test. New: tests/unit/sourceRules.test.ts fails the build on dangerouslySetInnerHTML, eval/new Function, Math.random, MD5/SHA-1, NEXT_PUBLIC_, console.log, http:// literals or silenced rules (each rule proven against an example); tests/integration/httpSecurity.test.ts checks the real server over HTTP: hardening headers, cross-origin and no-origin starts refused, blocked targets (other hosts, our own /api, credentials in the URL, file:), id validation and path tricks, the story cap, and screenshots served as image/jpeg with nosniff.
- [x] SonarQube Cloud: 0 bugs, 0 vulnerabilities, code smells fixed, duplication under 3%, coverage at least 80% on new code. **HUMAN:** review each security hotspot in the SonarQube Cloud UI and mark it Safe with a reason, or fix it.
- [x] CI job `integration`: `npx playwright install --with-deps chromium`, build, start the app, run `npm run test:integration` with `LLM_PROVIDER=replay`.
  - Green on GitHub from 6026c90 (9 Oct): about 5 minutes, and the scorecard table shows on the run page.
- [x] CLI `scripts/run-agent.ts` using `createContainer`: `npm run agent -- --url <url> --story "<text>"` writes JUnit and Markdown to `./reports` and exits non-zero on failures. This proves the core runs outside Next.
  - npm run agent narrates, writes JUnit and Markdown, exits 1 on failures; --story-file for multi-line stories (npm on Windows cuts arguments at a line break). Used to run TestPilot on Playwright's TodoMVC demo: 17 steps passed, one repair.
- [x] Run history survives a restart: a `FileRunRepository` appends each run's events to `.data/runs/<runId>.jsonl` and rebuilds the view through `projectRun` on load. Swap it in at `createContainer`; nothing else changes.
  - FileRunRepository: memory plus .data/runs (JSON per run, append-only event log); an interrupted run is marked stopped on start. Integration tests use .data/integration.
- [ ] Find the cause of the dev-only hydration warning on the shop's checkout page in the agent's browser and fix it (don't suppress it). Then drop the line from the README's limitations.
- [x] Log why a run failed. `RunService` logs only unexpected errors, so an `LlmError` (a provider 503, say) reaches the client as "kept failing" with nothing in the server log. Log the code and the cause's message (never the request body or headers) at warn level.
  - RunService logs expected failures at warn level with the error code and the cause's message (capped at 300 characters, never request data): an outage now reads 'Run <id> stopped, LLM_FAILED, You exceeded your current quota' in the server log.
- [ ] `Dockerfile` on `mcr.microsoft.com/playwright:v1.63.0-noble`: `npm ci`, build, `npm start`, `.data` as a volume. The backup laptop or a VM then runs the exact same build.
  - Written with .dockerignore (9 Oct), not built yet: Docker Desktop is not running on this VM. Tick after `docker build -t testpilot .` and a run in the container work.
- [x] Final README pass: setup works from a clean clone on Windows and macOS or Linux.
  - CI installs from a clean checkout on Linux (npm ci, build, unit and real-browser tests) and passes; this Windows VM runs the same commands. README leads with the four differences and documents the CLI, backups, history and the real-site run.

---

## Phase 6: Demo readiness (Fri 9 Oct, afternoon)

- [ ] Feature freeze at 16:00. Only bug fixes after that.
- [x] Demo settings: `AGENT_MAX_SCENARIOS=3`, every run under about 40 seconds. Do a warm-up run before going on stage.
  - Do not change AGENT_MAX_SCENARIOS or the other AGENT_* limits: they are part of every planning prompt, so replay would no longer find the recordings. Runs already take 4 to 30 s each in replay (see the scorecard).
  - Keep the recorded limits (see the note above). Warm-up run: part of the laptop checklist on the day.
- [x] Add the `replays:record` script that CLAUDE.md lists (it runs each suggestion story on each release with `LLM_RECORD=true`), then record the three stories that aren't recorded yet: bad cellphone number, delivery fee on the confirmation, every navigation link works. Then every suggestion card works offline.
  - All four suggestion stories recorded for every release (fresh redesign plans too), plus Playwright's TodoMVC demo.
  - Script added: `npm run replays:record` runs the scorecard with the live model and records it. On 7 Oct the free tier (20 requests per model per day) ran out after stories 1 and 3 (gemini-3.6-flash) and story 2 on stable and buggy plus story 4 on stable (gemini-3.7-flash). **To do after the daily reset:** record story 2 on redesign and story 4 on buggy and redesign, then add both titles to `RECORDED` in the scorecard.
  - The recorder now answers any request it already recorded from the recording, so `replays:record` spends provider calls only on what is missing. Still missing: a fresh plan for each story on redesign (a fresh redesign run in replay mode stops with a message that says what to do), story 2 on redesign and story 4 on buggy and redesign.
- [ ] Offline drill: Wi-Fi off, `LLM_PROVIDER=replay`, the whole script still works.
- [ ] Record a backup screen capture of the full demo. Keep it on the laptop and a USB stick.
- [ ] Rehearse three times with a timer. One person drives, one person talks.
- [ ] Laptop: `npm run build && npm start`, notifications off, other apps closed, browser zoom 125%, charger packed, second laptop set up the same way.
  - On the day: one warm-up run on stable before going on stage. A public link, if wanted, comes from a Cloudflare quick tunnel (`cloudflared tunnel --url http://localhost:3000`) with APP_BASE_URL and TARGET_ALLOWLIST set to its address; on stage, use localhost.

### Demo script (5 minutes, all live)

Lead with what last year's winners did not show (real results, story to running tests, proof, tests you keep). Self-healing won 1st place last year, so it is a supporting moment here, not the headline.

| Time | Show | Say |
|---|---|---|
| 0:00 to 0:30 | Landing page | Small teams test checkout by hand, and their scripts break whenever the UI changes. TestPilot turns a plain user story into tests that run in a real browser, and every result on screen actually happened. |
| 0:30 to 1:45 | New run on Kota Express `buggy`, "Order two kotas and check out", "Start run" | Receives a URL and a story; decides by reading each page; the plan appears with each acceptance criterion. Real screenshots arrive. It fails: two kotas, but the total charges for one. Open the bug: steps to reproduce, expected against actual, the screenshot. Traceability tab: which criterion failed. |
| 1:45 to 2:30 | "Run this plan on Stable" in the summary under the header | Is it the shop or the test? The same plan passes on the stable release, so the failure was a real bug, not a bad plan. That is the check our scorecard runs for every seeded bug. |
| 2:30 to 3:10 | Export tab: download the Playwright test; "Or on another screen: iPhone" | The team keeps this test; it runs with `npx playwright test`. The same plan on an iPhone screen, touch and all. |
| 3:10 to 3:50 | "Run this plan on Redesign", Needs review tab | The developers renamed the buttons. The run still passes, and it lists every repair for a person to check, because a repair can hide a regression. |
| Optional, only with Wi-Fi (30 s, take it from the scorecard slot) | New run: "Or try a real site made for practice: Playwright's TodoMVC demo", Start run | It is not tied to our shop: a public app it has never seen, planned from a plain story and run for real. |
| 3:50 to 4:40 | README scorecard and badges | How we know it works: every suggested story on every release, each seeded bug caught, no false failures. SonarQube quality gate, 372 unit and 31 real-browser tests, accessibility checked, and TestPilot passes its own self-test. |
| 4:40 to 5:00 | Back to the dashboard | Who it's for, and what's next: native Android and iOS apps (the same locator model maps to Android UiSelector and iOS XCUIElementType), CI on every pull request. |

---|---|---|
| 0:00 to 0:30 | Landing page | Who has the problem: small teams test checkout by hand before every release, and their test scripts break whenever a button is renamed. |
| 0:30 to 1:30 | New run on Kota Express `stable`, click "Order two kotas and check out", "Start run" | The agent receives a URL and a story, decides what to test, and executes it in a real browser. Point at the plan appearing and real screenshots arriving. Optional: run headed with slow-mo so the room sees Chromium move. |
| 1:30 to 2:45 | Same story on `redesign` | The developers renamed the buttons. A normal script would break here. Watch the detours: healed steps, each listed under "Needs review" with what changed. |
| 2:45 to 4:00 | Same story on `buggy`, open the bug | A real bug: two kotas, but the total charges for one. Expected vs actual, steps to reproduce, the screenshot. Download JUnit and the Playwright spec: the team keeps the test. |
| 4:00 to 4:40 | README scorecard and SonarQube Cloud badges | How we know it works: every seeded bug caught, no false failures on the stable release. The LLM proposes, Playwright decides, so a result on screen actually happened. |
| 4:40 to 5:00 | Back to the dashboard | Who it's for and what's next (CI runs on every pull request, phones: mobile web now, native Android and iOS apps next). |

---

## After the hackathon

Each of these keeps rule zero: the LLM proposes, a real driver decides.

- [ ] The application should be able to test apk and ios applications (step 2, native). Add an `IAppSession` port beside `IBrowserSession`, with an Appium 2 adapter: UiAutomator2 runs an `.apk` on an Android emulator, and XCUITest runs an iOS app in the simulator (needs macOS with Xcode). Map the native accessibility tree onto the same `Locator` model (role, label, text), so planning, healing, bug reports and exports work unchanged. Uploaded `.apk` and `.ipa` files run only in a throwaway emulator, never on the host.
- [ ] Accessibility findings: run axe-core on every explored page and report WCAG violations as `Finding`s. The checks are deterministic, so the LLM still decides nothing.
- [ ] Sites behind a login: a test account per target in server env, entered by a fixed sign-in step before each scenario. The credentials never reach the LLM, the screenshots' captions or the reports.
- [ ] CI mode: a GitHub Action that runs TestPilot against a pull request's preview URL, uploads the JUnit XML and comments the bug list on the pull request.
- [ ] API checks: record the JSON requests each scenario makes and assert their status and shape next to the UI steps.
- [ ] Visual changes: compare each step's screenshot with the last passing run on the same target and list differences above a threshold under "Needs review", like heals.

---

## Cut list (cut from the top when behind)

1. Device choice for mobile web (say it on stage as "next" instead)
2. Dockerfile and file-backed run history
3. CLI
4. History page
5. Markdown export
6. Traceability tab
7. Landing page flight-path animation (use a static screenshot of a real run)
8. CI integration job (run it locally instead)

Never cut: real browser execution, healing on `redesign`, bug reports on `buggy`, unit tests, the security rules, the README.
