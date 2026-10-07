# TestPilot

TestPilot tests websites the way a QA analyst would. Give it a URL and a user story. It opens a real browser, works out what to test, clicks through the flows and tells you what broke, with screenshots and the steps to reproduce it.

We're building it for the [Sebaka Testing AI Hackathon 2026](https://sebakasouthafrica.co.za/ai-agent-challenge.html), functional testing track. The idea on one page: [docs/IDEA.md](docs/IDEA.md).

[![CI](https://github.com/PhathutshedzoPR/AI-Agent-Functional-testing/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/PhathutshedzoPR/AI-Agent-Functional-testing/actions/workflows/ci.yml)
[![Quality gate](https://sonarcloud.io/api/project_badges/measure?project=PhathutshedzoPR_AI-Agent-Functional-testing&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=PhathutshedzoPR_AI-Agent-Functional-testing)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=PhathutshedzoPR_AI-Agent-Functional-testing&metric=coverage)](https://sonarcloud.io/component_measures?id=PhathutshedzoPR_AI-Agent-Functional-testing&metric=coverage)
[![Security rating](https://sonarcloud.io/api/project_badges/measure?project=PhathutshedzoPR_AI-Agent-Functional-testing&metric=security_rating)](https://sonarcloud.io/component_measures?id=PhathutshedzoPR_AI-Agent-Functional-testing&metric=security_rating)

## The problem

Small teams ship often and test by hand. Before a release, someone clicks through sign-up and checkout. On a busy week nobody does, and customers find the bug first.

Teams that do automate find their tests breaking every time a button is renamed or a page is rearranged. Fixing selectors becomes a chore, and the suite gets switched off.

## What TestPilot does

| Stage | What happens |
|---|---|
| **Receives** | A URL, and optionally a user story with acceptance criteria. |
| **Decides** | Reads each page's accessibility tree, then plans happy-path, negative and edge-case scenarios. |
| **Executes** | Runs every step in headless Chromium with Playwright and takes a screenshot after each one. When a button has been renamed, it finds it again and marks the step as healed so a person can check it. |
| **Delivers** | A live dashboard, bug reports with expected and actual results, a traceability table (each acceptance criterion, the scenarios that test it and their result), JUnit XML for CI, a Markdown report and a Playwright test file your team can keep. |

## The AI proposes, Playwright decides

The language model plans the tests and suggests how to find elements. It never decides whether a test passed. Every pass or fail comes from a real assertion in a real browser, every screenshot is a real capture, and every timing is measured.

If TestPilot shows you a result, it happened.

## Try it

You need Node 22 or newer and an API key for Gemini, Claude or OpenAI. A run makes only a handful of model calls, so Gemini's free tier is enough to try it.

```bash
git clone https://github.com/PhathutshedzoPR/AI-Agent-Functional-testing.git testpilot
cd testpilot
npm install
npx playwright install chromium
cp .env.example .env.local
```

Put your provider, model and key in `.env.local` (we use `LLM_PROVIDER=google` with a Gemini Flash model such as `LLM_MODEL=gemini-3.6-flash`), then:

```bash
npm run dev
```

Open http://localhost:3000 (use `localhost`, not `127.0.0.1`: writes must come from `APP_BASE_URL`), click **Run a test**, pick Kota Express and a suggested story, and click **Start run**.

For the demo, use a production build: `npm run build` then `npm start`.

No key? Set `LLM_PROVIDER=replay`. TestPilot then serves plans recorded in `fixtures/llm-replays` and the browser still runs every step for real. A replay only matches the exact story text and page content it was recorded with; record more with `npm run replays:record` (needs a live provider key in `.env.local`).

### The demo in three runs

1. **Stable:** pick Kota Express (stable) and "Order two kotas and check out". Every step passes.
2. **Redesign:** when the stable run finishes, click **Run this plan on Redesign**. The same plan meets renamed buttons; the flight path shows each healed step as a detour, and **Needs review** lists what changed.
3. **Buggy:** start a fresh run on Kota Express (buggy) with the same story. TestPilot reports the cart-total bug with steps to reproduce, expected against actual, and the screenshot, and flags the Specials link that returns 404. Download the JUnit XML or the Playwright test from **Export**.

## Kota Express

Testing a tester needs a site where you already know the right answers. Kota Express is a small kota ordering site that ships inside this repo at `/demo-shop`, in three releases:

- **stable** works.
- **redesign** behaves the same, but the buttons are renamed and the layout has moved. Hand-written test scripts break here. TestPilot heals and flags what changed.
- **buggy** has four seeded bugs, including a cart total that ignores quantity and a cellphone field that accepts letters.

### What happened when we ran it

The agent scorecard (`tests/integration/scorecard.test.ts`) runs each suggestion story on every release. Gemini planned these runs live on 7 October 2026 (`gemini-3.6-flash`) and every model response is recorded in `fixtures/llm-replays`. The table below comes from replaying those recordings with the current code, so the plans are the model's, while every click, check and screenshot happened in real Chromium. Redesign re-runs the plan made on stable, so it meets the renamed buttons the way an old test suite would.

| Story | Release | Result | Steps | Bug reported | Time |
|---|---|---|---|---|---|
| Order two kotas and check out | stable | Passed | 17 passed | none | 9 s |
| | redesign | Passed after healing | 10 passed, 7 healed, 0 failed | none | 20 s |
| | buggy | Bugs found | 15 passed, 1 failed | Cart total shows R 35,00 instead of R 70,00 for two Quarter Kotas | 14 s |
| The confirmation shows the delivery fee | stable | Passed | 12 passed | none | 8 s |
| | redesign | Passed after healing | 9 passed, 3 healed, 0 failed | none | 14 s |
| | buggy | Bugs found | 11 passed, 1 failed | Delivery fee R 30,00 is not displayed on confirmation page | 15 s |

On every buggy run the explorer also reported the Specials link returning 404. To prove a failure on buggy comes from a seeded bug and not from a bad plan, the scorecard re-runs buggy's own plan on stable, where it passes.

Not scored yet: the free Gemini tier allows 20 requests per model per day, and we ran out mid-recording. "Checkout rejects a bad cellphone number" is recorded (with `gemini-3.7-flash`) on stable (passes) and buggy (catches the cellphone bug) but not its redesign heals; "Every navigation link works" is recorded on stable only. The scorecard lists both as to-do until `npm run replays:record` has saved them.

On redesign, rules repaired the renamed "Add to bag" buttons; the LLM proposed "Proceed to payment" and "Confirm order", and each suggestion was checked in the browser before use. A rename found once is reused for the rest of the run, so later checks such as "the Confirm order button is gone" test the renamed control, not a button that no longer exists.

![A finished redesign run: the flight path shows healed steps as detours](docs/images/run-redesign-healed.png)

The automated proof lives in `tests/integration`: a hand-written plan and a scripted-plan agent run against the real app in real Chromium (stable passes, buggy fails at the cart total, redesign passes by healing), and an exported Playwright spec that passes with `npx playwright test`.

## How it's built

```mermaid
flowchart LR
    UI[Dashboard] -->|start run| API[API routes]
    API --> Service[RunService]
    Service --> Agent[TestAgent]
    Agent --> Explorer[SiteExplorer]
    Agent --> Planner[TestPlanner]
    Agent --> Executor[ScenarioExecutor]
    Executor --> Healer[SelfHealer]
    Agent --> Reporter[BugReporter]
    Planner -.-> LLM[(LLM)]
    Healer -.-> LLM
    Executor --> Browser[(Chromium via Playwright)]
    Agent -->|events| Bus[Event bus]
    Bus -->|Server-Sent Events| UI
```

- **Next.js 16** and TypeScript for the dashboard, the API and the demo shop.
- **Playwright** drives Chromium. The agent finds elements the way a person would describe them (role and name, label, visible text), so the tests it exports read like good hand-written ones.
- **Vercel AI SDK** talks to Gemini, Claude or OpenAI. Every response is checked against a Zod schema before we use it.
- **SonarQube Cloud**, ESLint with the SonarJS rules, and Vitest run on every push.

The code is split so the agent doesn't know it lives in a web app:

| Folder | What's in it |
|---|---|
| `src/core` | The agent, the domain model and the interfaces it needs. Plain TypeScript with no framework imports. |
| `src/adapters` | Playwright, the LLM providers, storage, exporters and the URL guard, each behind an interface from `src/core/ports`. |
| `src/server` | Wiring, environment validation, rate limiting and HTTP helpers. |
| `src/app`, `src/components` | The dashboard, the API routes and Kota Express. |
| `tests` | Unit tests with fakes, and integration tests against Kota Express in a real browser. |

Because the core only depends on interfaces, the same agent also runs from the command line (`npm run agent`), which is how it would sit in a CI pipeline.

Patterns we used on purpose: Strategy for actions, healing and exporters; Template Method for the agent's pipeline; Observer for live events; Decorator for recording LLM responses; Repository for runs; constructor injection from a single composition root.

## Security

An agent that opens whatever URL you give it, on a server, needs guard rails:
/
- API keys stay on the server and are validated before use. Nothing secret reaches the browser.
- By default the agent only visits hosts on an allowlist. In public mode it refuses private, loopback and cloud metadata addresses, and checks every request the browser makes, including redirects.
- Web pages are untrusted input. The model's output has to match a schema and an allowlist of actions, and nothing it returns is run as code.
- Every API input is validated. Runs are rate-limited, time-boxed and capped in steps and LLM calls, and the browser is always closed afterwards.
- Known gap: in public mode, DNS rebinding could slip between our address check and the browser's own lookup. Allowlist mode doesn't have this problem.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server on port 3000 |
| `npm run build`, then `npm start` | Production build and server (use this for the demo) |
| `npm run check` | Lint, typecheck and unit tests (324 tests) |
| `npm run test:coverage` | Unit tests with coverage for SonarQube Cloud |
| `npm run test:integration` | Builds the app, starts it on a spare port and runs the agent against Kota Express in real Chromium, including the scorecard (every suggestion story on every release, replayed); the scorecard table lands in `.data/scorecard.md` |
| `npm run replays:record` | The same scorecard with the live model from `.env.local`, saving every response to `fixtures/llm-replays`. Requests already recorded are answered from the recording, so only new ones use provider calls. Re-run it whenever a prompt changes |
| `npm run format` | Prettier |

Planned, not built yet: a command-line runner (`npm run agent`) for CI pipelines.

## Limitations

- It needs a long-running Node server: a laptop, a VM or Docker. Serverless functions can't launch Chromium the way we use it.
- One run at a time. Others wait in a queue.
- It can't get past CAPTCHAs or two-factor logins.
- Healing can hide a real change. That's why healed steps are listed for review instead of counted as clean passes.
- Run history is kept in memory and is lost when the server restarts. Screenshots stay in `.data/artifacts`.
- The planner cannot see pages that only appear after an action (such as the order confirmation). On those pages it checks only values it saw earlier, such as the delivery fee from checkout, never wording it would have to guess.
- In development, Next.js sometimes reports a hydration warning on the shop's checkout page inside the agent's browser; it shows up as a console-error finding. Production builds don't report it.

## History

The first prototype (tag `v0-prototype`) was a single-file dashboard that sketched the product with simulated results. This version runs every test in a real browser.

## Team

Built for the Sebaka Testing AI Hackathon 2026, functional testing track.

| Name | Role |
|---|---|
| Tokollo | Software development |
| Phathutshedzo | Project management |
| Gundo | Business analysis |

## Licence

MIT
