# TestPilot: the idea

Sebaka Testing AI Hackathon 2026, functional testing track. Team: Tokollo (software development), Phathutshedzo (project management), Gundo (business analysis).

## The problem

Small teams test their checkout by hand before every release, because writing automated tests takes time they don't have. Teams that do automate watch their tests break whenever a button is renamed or a page is rearranged, until fixing selectors becomes a chore and the suite gets switched off.

## The idea

TestPilot is an AI agent that tests a website the way a QA analyst would. You give it a web address and, if you like, a user story with acceptance criteria. It reads the site, decides what to test, runs every step in a real browser and tells you what broke.

| Stage | What TestPilot does |
|---|---|
| Receives | A URL and an optional user story with acceptance criteria. |
| Decides | Reads each page's accessibility tree (what a screen reader sees), then plans happy-path, negative and edge-case scenarios mapped to the criteria. |
| Executes | Runs each step in Chromium with Playwright, on a desktop or a phone screen (iPhone or Android profile), screenshots it, and when a control has been renamed, finds it again (self-healing) and flags the step for review. |
| Delivers | A live dashboard, bug reports with steps to reproduce, expected against actual and a screenshot, a traceability table, JUnit XML for CI, a Markdown report and a Playwright test file the team keeps. |

## What makes it different

1. **Every result is real.** The language model only writes plans, suggests element locators and words bug titles. Every pass or fail comes from a Playwright check on the real page, every screenshot is real and every duration is measured. Nothing is simulated.
2. **A user story becomes tests that run.** The acceptance criteria in a plain story become happy-path, negative and edge-case scenarios that run in the browser, and a traceability table shows which criterion passed or failed.
3. **Proven on bugs we planted.** A scorecard runs each suggested story on three releases of our demo shop (stable, a redesign with renamed buttons, and a release with seeded bugs) and checks each seeded bug is caught. To prove a failure comes from the bug and not a bad plan, the buggy release's plan is re-run on stable, where it passes.
4. **Tests you keep.** Each run exports a Playwright spec built from the same locators the agent used. Our integration tests run that exported file with `npx playwright test`, on a desktop and on a phone screen, and it passes.
5. **A flight recorder you can follow.** Each run is drawn as a flight path: scenarios are routes, steps are waypoints, repairs are detours and failures break the line.

When a button is renamed, TestPilot repairs the step (rules first, the model second, confirmed in the browser) but never hides it: repaired steps are listed under "Needs review", because a repair can mask a real regression.

## Results so far (real runs, replayed in real Chromium)

| Story | Stable | Redesign (old plan, renamed buttons) | Buggy |
|---|---|---|---|
| Order two kotas and check out | 17 passed | 10 passed, 7 healed, 0 failed | Caught: cart total R 35,00 instead of R 70,00 |
| The confirmation shows the delivery fee | 12 passed | 9 passed, 3 healed, 0 failed | Caught: confirmation shows the wrong delivery fee |

Every buggy run also reports the Specials link returning 404.

## Built to last

Next.js 16 and TypeScript (strict), ports-and-adapters architecture with the agent core free of framework code, Playwright, the Vercel AI SDK with Gemini, Zod validation on every input and every model response, 372 unit tests and 31 real-browser integration tests, SonarQube Cloud quality gate passing, and CI on every push. The agent never leaves the target's site, treats page content as data rather than instructions, and checks every browser request, redirects included, against its target policy.

## What's next

Native Android and iOS apps through Appium (phone screens in the browser already work), accessibility checks with axe-core, sites behind a login, and a GitHub Action that runs TestPilot on every pull request.
