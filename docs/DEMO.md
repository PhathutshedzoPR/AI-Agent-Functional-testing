# Demo day: TestPilot in five minutes

Sebaka Testing AI Hackathon 2026, Saturday 10 October, UJ JBS. Live demo, no code walkthrough.

## Before you go on

1. On the demo laptop: `npm run build`, then `npm start`. In `.env.local`: `LLM_PROVIDER=replay`, `APP_BASE_URL=http://localhost:3000`, `TARGET_ALLOWLIST=localhost:3000,demo.playwright.dev`.
2. Open http://localhost:3000 in Chrome, zoom 125%, notifications off, other apps closed, charger in.
3. Warm-up: one run of "Order two kotas and check out" on Stable. It should pass in about 10 seconds.
4. Have the backup screen recording open in another window, and this page on a phone.

Replay mode means the plans come from recorded Gemini answers, so no Wi-Fi or API quota is needed; the browser still clicks every step for real. Only the optional TodoMVC moment needs internet.

## The script

| Time | Do | Say |
|---|---|---|
| 0:00 | Landing page | "Small teams test their checkout by hand before every release, and their test scripts break when the UI changes. TestPilot turns a plain user story into tests that run in a real browser. Every result you see actually happened." |
| 0:30 | **Run a test** → Kota Express (buggy) → "Order two kotas and check out" → **Start run** | "It receives a site and a story with acceptance criteria. It reads every page, plans scenarios for each criterion, and runs them in Chromium." Point at the plan, then the screenshots arriving. |
| 1:15 | When it lands: the red summary, then the **Bugs** tab | "A real bug: two kotas, but the total charges for one. Steps to reproduce, expected against actual, the screenshot." Open **Traceability**: "and which acceptance criterion failed." |
| 1:45 | **Run this plan on: Stable** (in the summary) | "Is it the shop or the test? Same plan, the release without the bug: it passes. So the failure was the bug, not a bad plan. Our scorecard runs this check for every bug we planted." |
| 2:30 | **Export** tab → Download Playwright test | "The team keeps this test: it runs with `npx playwright test` in their own pipeline." |
| 2:50 | **Run this plan on: Redesign**, then **Needs review** | "Now the developers renamed the buttons. The old plan still passes, and every repair is listed for a person to check, because a repair can hide a regression." |
| 3:30 | **Or on another screen: iPhone** (in the summary) | "And the same plan on an iPhone screen: touch, size and all." |
| 3:50 | README on GitHub: the scorecard and badges | "How we know it works: four stories on three releases, every planted bug caught, no false failures, and TestPilot passes its own self-test. 372 unit tests, 31 real-browser tests, SonarQube quality gate." |
| 4:40 | Back to the dashboard | "Next: native Android and iOS apps (the same locator model maps to Android and iOS accessibility), and a run on every pull request." |

Optional, only with Wi-Fi and if time allows (take it from the scorecard slot): **Run a test** → "Or try a real site made for practice: Playwright's TodoMVC demo" → **Start run**. "Not tied to our shop: a public app it has never seen."

## If something goes wrong

- **A run fails to start or hangs:** press **Stop run**, then start the same story again. Still stuck: switch to the backup recording and keep talking over it.
- **"This server only takes runs started from ...":** TestPilot is open at a different address from `APP_BASE_URL` (for example localhost while the public tunnel is live). Use the link the page shows, or set `APP_BASE_URL` to the address you are using and restart.
- **"No recorded plan for this story":** you started a story that is not recorded on that release. Use the suggested story text exactly, or reach Redesign with **Run this plan on Redesign**.
- **The laptop dies:** second laptop, set up the same way, or the backup recording.
- **Wi-Fi is down:** nothing changes in replay mode. Skip the TodoMVC moment.

## Questions judges are likely to ask

- **"How do I know it isn't faking results?"** The AI only proposes plans and element suggestions; every pass or fail is a Playwright check in a real browser, with a screenshot and a measured time. Replayed plans are labelled "Replayed plan".
- **"What if the AI makes a mistake in the plan?"** Plans are validated before they run; a scenario with an invalid step is set aside and shown as not tested, never as a fake failure. Every repair is confirmed in the browser and listed for review.
- **"How is this different from a self-healing framework?"** Healing is one part. The core is going from a plain story to running tests, proving each failure is a real bug, and handing over a Playwright test the team keeps.
- **"Does it work on other sites?"** Yes: it passed Playwright's TodoMVC demo, a site it had never seen, from a plain story.
- **"What if Gemini is down?"** It falls back to NVIDIA's Kimi K3, then OpenRouter's Nemotron, and logs which answered. On stage we use recorded plans, so it does not depend on any provider.
- **"Is it safe to point at a URL?"** Only allowlisted sites (or public addresses in public mode), every browser request and redirect checked, the agent never leaves the site or calls our own API, page text is treated as data, never instructions.
