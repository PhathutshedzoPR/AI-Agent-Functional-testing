# TestPilot AI 🚀

> AI-powered testing dashboard for the **Sebaka Hackathon** — catch bugs before your users do.

---

## What It Does

TestPilot AI is a single-page, browser-native QA dashboard that combines structured test execution with Gemini AI analysis. Drop in your Gemini API key, pick a target type, and watch the pipeline catch failures — complete with annotated screenshot evidence and AI-generated root-cause explanations.

---

## Features

| Capability | Detail |
|---|---|
| **8 Target Types** | Web App, REST/GraphQL API, Android APK, Source Code, Database, Spec/PDF, Security Scan, Performance |
| **22 Test Cases** | Spread across Functional, Security, Performance, Compatibility, Accessibility, Regression, Integration, Database quality categories |
| **Screenshot Evidence** | Canvas-rendered mock browser frames with red failure highlight boxes — no real browser automation required |
| **AI Root-Cause Analysis** | Gemini explains *why* each failure happened and *how* to fix it |
| **Recommendations Panel** | 8 AI-driven QA priorities ranked by risk, with severity badges and fix-effort estimates |
| **Live Pipeline Log** | Real-time test execution log with pass/fail/skip status per step |
| **Bug Reports** | Auto-generated bug cards with severity, reproduction steps, expected vs. actual, and embedded screenshot |
| **Export** | Copy report as JSON, CSV, or JUnit XML (CI-ready) |
| **OOP Architecture** | 9 ES6 classes, EventBus pub/sub, clean separation of concerns |

---

## Architecture

```
TestPilot (app entry point)
├── EventBus          — decoupled pub/sub between modules
├── StorageManager    — safe localStorage with JSON serialisation
├── GeminiClient      — REST calls to generativelanguage.googleapis.com
├── ScreenshotEngine  — HTML5 Canvas mock-browser renderer
│   ├── _drawCheckout()   Web 502 error state
│   ├── _drawLogin()      SQL injection bypass
│   ├── _drawApi()        500 JSON terminal response
│   ├── _drawApk()        apktool exported-activities output
│   ├── _drawCode()       dead-branch code highlight
│   └── _drawDb()         negative-stock race condition
├── TestCase          — single test definition + runtime state
├── BugReport         — structured defect with screenshot data URI
├── TestRunner        — async state machine; drives test loop
└── ReportGenerator   — summary(), toJSON(), toCSV(), toJUnit()
```

All modules communicate via `EventBus` events (`test:start`, `test:done`, `run:complete`, etc.) so the UI never calls runner internals directly.

---

## Quick Start

1. **Open** `TestPilot_AI.html` in any modern browser (Chrome, Edge, Firefox).
2. Click the **⚙ Config** icon (top-right) and paste your **Gemini API key**.
3. Select a **model** (`gemini-1.5-flash` is fastest; `gemini-1.5-pro` is most thorough).
4. Choose a **Target Type** from the dropdown (e.g. *Web App*, *Android APK*).
5. Hit **▶ Run Tests** on the Dashboard and watch the pipeline execute.
6. Switch to **Bugs** to inspect failure screenshots and AI explanations.
7. Open **AI Report** for the full coverage breakdown and export options.

> **No API key?** The dashboard still runs with deterministic mock results — you just won't get live Gemini analysis text.

---

## Target Types & What Gets Tested

### 🌐 Web App
Checkout flow, payment gateway, form validation, XSS resistance, WCAG contrast, Core Web Vitals, session handling, cookie security.

### 🔌 REST / GraphQL API
Rate limiting, schema validation, authentication bypass, error format consistency, response-time SLAs, CORS headers, pagination edge-cases, input sanitisation.

### 📱 Android APK
Exported activity enumeration, permission over-grant, debug flag detection, certificate pinning, memory leak profiling, deep-link hijacking, obfuscation checks, backup-flag exposure.

### 💻 Source Code
Dead-code branch detection, SQL injection sink tracing, hardcoded secret scanning, async race-condition analysis, dependency CVE check, cyclomatic complexity, error-handling coverage, type-safety audit.

### 🗄️ Database
Race condition on concurrent writes, N+1 query detection, index coverage on hot queries, referential-integrity constraint verification, transaction isolation level, slow-query threshold, backup/restore roundtrip, connection-pool exhaustion.

### 📄 Spec / PDF
Requirement traceability, ambiguity scoring, acceptance-criteria completeness, UI copy consistency, edge-case documentation coverage, regulatory-keyword scan, version-delta diff.

### 🔒 Security Scan
CVE dependency audit, TLS configuration grade, HTTP security-header checklist, OWASP Top-10 surface mapping, secrets-in-repo detection, JWT algorithm confusion, CSRF token validation, clickjacking frame-options.

### ⚡ Performance
Time-to-first-byte, Lighthouse score regression, bundle-size budget, cache hit-rate, memory heap growth, CPU flame-graph hotspot, third-party script cost, server error-rate under load.

---

## Screenshot Evidence Engine

When a test fails, `ScreenshotEngine` renders a 600 × 380 mock browser frame on a hidden `<canvas>` element. Each renderer draws page-specific content (form fields, terminal output, code lines, SQL results) then overlays:

- A **red translucent highlight box** around the failure region
- A **⚠ label** naming the failure
- A **grey annotation strip** at the bottom with a one-line explanation

The canvas is serialised to a PNG data URI and embedded directly in the bug card — no server, no file system, no external dependencies.

---

## AI Recommendations Panel

Eight standing recommendations are always visible, ranked by risk:

| # | Risk Area | Severity |
|---|---|---|
| 1 | Payment gateway error handling | Critical |
| 2 | SQL injection hardening | Critical |
| 3 | Accessibility WCAG 2.1 AA | High |
| 4 | API rate-limit & retry logic | High |
| 5 | Mobile performance budget | Medium |
| 6 | Session token rotation | Medium |
| 7 | Dependency CVE patching | Low |
| 8 | Test coverage baseline (80 %) | Low |

Each card shows estimated fix effort (e.g. "2–4 h") and a one-line rationale.

---

## Export Formats

| Format | Use Case |
|---|---|
| **JSON** | Attach to a Jira/Linear ticket or feed into a CI artifact |
| **CSV** | Paste into Google Sheets / Excel for stakeholder review |
| **JUnit XML** | Drop into Jenkins, GitHub Actions, or any CI that reads Surefire reports |

All exports are copied to the clipboard (clipboard API with `execCommand` fallback).

---

## Tech Stack

- **Vanilla ES6** — no build step, no bundler, no `node_modules`
- **HTML5 Canvas API** — screenshot rendering
- **Google Fonts** — Inter (UI) + JetBrains Mono (code/logs)
- **Gemini REST API** — `generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`
- **CSS custom properties** — dark-first design tokens with `prefers-color-scheme: light` override

---

## Customising

### Add a new test case
```js
// Inside TestRunner constructor, push to this.tests:
new TestCase({
  id: 'TC-023',
  title: 'My New Test',
  category: 'Functional',
  priority: 'High',
  targetType: 'Web App',
  steps: ['Step 1', 'Step 2'],
  expected: 'Expected result',
  screenshotCfg: { page: 'checkout', failRegion: { x:120, y:180, w:360, h:60 }, label:'MY FAILURE', annotation:'What went wrong' }
})
```

### Make a test always fail (deterministic)
```js
// In TestRunner.run(), add the ID to FAIL_IDS:
const FAIL_IDS = new Set(['TC-002','TC-007','TC-012','TC-015','TC-017','TC-022','TC-023']);
```

### Add a new screenshot renderer
```js
// In ScreenshotEngine, add a method and map it:
_drawMyPage(c, W, H) { /* use c.fillRect, c.fillText, etc. */ }
// Then in render(), add to the page switch:
case 'mypage': this._drawMyPage(c, W, H); break;
```

### Change the Gemini model
Select from the **Config** panel: `gemini-1.5-flash`, `gemini-1.5-pro`, or `gemini-2.0-flash`.

---

## File Structure

```
TestPilot_AI.html     ← entire app (single file, self-contained)
README.md             ← this file
```

---

## Limitations

- Screenshot frames are **mock renderings**, not real browser captures. They illustrate *where* a failure occurs; actual pixel evidence requires a headless browser (Playwright/Puppeteer).
- Export uses the clipboard API. In environments where `navigator.clipboard` is blocked (some CI headless contexts), it falls back to `document.execCommand('copy')`.
- Gemini API calls go directly from the browser — keep your API key out of version control and consider a backend proxy for production use.
- localStorage is used for API-key persistence; it is session-scoped per origin and is cleared with the browser.

---

## Hackathon Notes (Sebaka)

This project was built for the **Sebaka Hackathon** to demonstrate how AI can accelerate QA workflows:

- **Zero infrastructure** — entirely client-side, deployable as a single HTML file to any static host (GitHub Pages, Netlify, Vercel)
- **AI-augmented QA** — Gemini provides root-cause analysis that would take a senior QA engineer hours to write
- **Modular by design** — the OOP class hierarchy makes it easy to swap the AI backend, add new test types, or plug in a real screenshot engine

---

## License

MIT — do whatever you want, just don't blame us if the tests pass and the app still breaks. 😄
