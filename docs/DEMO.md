# Demo day: TestPilot in five minutes

Sebaka Testing AI Hackathon 2026, Saturday 10 October, UJ JBS. Live demo, no code walkthrough.

## Before you go on

1. On the demo laptop: `npm run build`, then `npm start`. In `.env.local`: `LLM_PROVIDER=replay`, `APP_BASE_URL=http://localhost:3000`, `TARGET_ALLOWLIST=localhost:3000,demo.playwright.dev`.
2. Open http://localhost:3000 in Chrome, zoom 125%, notifications off, other apps closed, charger in.
3. Warm-up: one run of "Order two kotas and check out" on Stable. It should pass in about 10 seconds. Do not skip it: the very first page load after `npm start` is slow (the server is cold) and would show as a failed performance check.
4. Have the backup screen recording open in another window, and this page on a phone.

Replay mode means the plans come from recorded Gemini answers, so no Wi-Fi or API quota is needed; the browser still clicks every step for real. Only the optional TodoMVC moment needs internet.

## The script

| Time | Do | Say |
|---|---|---|
| 0:00 | Landing page | "Small teams test their checkout by hand before every release, and their test scripts break when the UI changes. TestPilot turns a plain user story into tests that run in a real browser: functional, performance and security in one run. Every result you see actually happened." |
| 0:30 | **Run a test** → Kota Express (buggy) → "Order two kotas and check out" → **Start run** | "It receives a site and a story with acceptance criteria. It reads every page, measures it, plans scenarios for each criterion, and runs them in Chromium." Point at the plan, then the screenshots arriving. |
| 1:10 | When it lands: the red summary, then the **Bugs** tab | "A real bug: two kotas, but the total charges for one. Steps to reproduce, expected against actual, the screenshot." Open **Traceability**: "and which acceptance criterion failed." |
| 1:35 | **Performance & security** tab | "On every page it read, it also measured performance and checked security. The checkout took 1.5 seconds to answer against an 800 millisecond budget, and any site can frame this shop, a clickjacking risk. Timings come from the browser; the security checks are passive, no attack traffic." |
| 2:05 | **Run this plan on: Stable** (in the summary), then its **Performance & security** tab | "Is it the shop or the test? Same plan, the release without the bugs: it passes, and every page is within budget and protected. So each failure was a real problem, not a bad plan or a made-up number." |
| 2:45 | **Export** tab → Download Playwright test (mention JUnit) | "The team keeps this test: it runs with `npx playwright test` in their own pipeline. The JUnit report carries every performance and security check as a test case for CI." |
| 3:05 | **Run this plan on: Redesign**, then **Needs review** | "Now the developers renamed the buttons. The old plan still passes, and every repair is listed for a person to check, because a repair can hide a regression." |
| 3:40 | README on GitHub: the scorecard and badges | "How we know it works: four stories on three releases, every planted bug caught, no false failures, and TestPilot passes its own self-test. 385 unit tests, 31 real-browser tests, SonarQube quality gate." |
| 4:30 | Back to the dashboard | "Next: native Android and iOS apps (the same locator model maps to Android and iOS accessibility), load tests with many users, and a run on every pull request." |

Optional if time allows: **Or on another screen: iPhone** (in the summary), "the same plan on an iPhone screen: touch, size and all." Only with Wi-Fi: **Run a test** → "Or try a real site made for practice: Playwright's TodoMVC demo" → **Start run**. "Not tied to our shop: a public app it has never seen."

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
- **"How do you test performance and security?"** On every page the agent reads, the browser's own Navigation Timing and Largest Contentful Paint entries are compared with Google's "good" budgets (time to first byte 800 ms, LCP 2.5 s, full load 3 s). Security checks read the page's own response: HTTPS, Content Security Policy, clickjacking protection, MIME-sniffing protection, Referrer Policy, HSTS and Secure cookies. Passive only: TestPilot sends no attacks, so it is safe on any allowed site. Load testing with many simultaneous users is next.
- **"Is it safe to point at a URL?"** Only allowlisted sites (or public addresses in public mode), every browser request and redirect checked, the agent never leaves the site or calls our own API, page text is treated as data, never instructions.
