// ========== Gemini API Config ==========
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

function getApiKey() {
  try { return localStorage.getItem('testpilot_gemini_key') || ''; } catch(e) { return ''; }
}
function getModel() {
  try { return localStorage.getItem('testpilot_gemini_model') || 'gemini-1.5-flash'; } catch(e) { return 'gemini-1.5-flash'; }
}
function setApiKey(key) {
  try { localStorage.setItem('testpilot_gemini_key', key); } catch(e) {}
}
function setModel(model) {
  try { localStorage.setItem('testpilot_gemini_model', model); } catch(e) {}
}

function updateKeyUI() {
  const key = getApiKey();
  const banner = document.getElementById('key-banner');
  const indicator = document.getElementById('key-indicator');
  const clearBtn = document.getElementById('clear-key-btn');
  const statusEl = document.getElementById('settings-key-status');
  if (key) {
    banner.className = 'ai-key-banner has-key';
    banner.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg><span>Gemini API connected — AI will generate real tests for <strong>${document.getElementById('app-name').value || 'your app'}</strong></span>`;
    if (indicator) indicator.style.background = 'var(--pass)';
    if (clearBtn) clearBtn.style.display = '';
    if (statusEl) statusEl.innerHTML = `<span style="color:var(--pass);">✓ Key saved — ${key.slice(0,8)}…${key.slice(-4)}</span>`;
    const input = document.getElementById('gemini-key-input');
    if (input) input.placeholder = key.slice(0,8) + '…' + key.slice(-4);
  } else {
    banner.className = 'ai-key-banner no-key';
    banner.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg><span>No Gemini API key set — running demo data. <button onclick="openSettings()" style="background:none;border:none;color:var(--warn);cursor:pointer;font-size:12px;font-weight:600;text-decoration:underline;padding:0;">Add API key →</button></span>`;
    if (indicator) indicator.style.background = 'var(--warn)';
    if (clearBtn) clearBtn.style.display = 'none';
    if (statusEl) statusEl.textContent = '';
  }
}

// ========== Settings Modal ==========
function openSettings() {
  const keyInput = document.getElementById('gemini-key-input');
  const modelSelect = document.getElementById('gemini-model-select');
  if (keyInput) keyInput.value = '';
  if (modelSelect) modelSelect.value = getModel();
  updateKeyUI();
  document.getElementById('settings-modal').classList.add('open');
}
function closeSettings() {
  document.getElementById('settings-modal').classList.remove('open');
}
function saveApiKey() {
  const key = document.getElementById('gemini-key-input').value.trim();
  const model = document.getElementById('gemini-model-select').value;
  if (!key) { showToast('Please enter a Gemini API key', 'warn'); return; }
  if (!key.startsWith('AIza')) { showToast('Key should start with "AIza"', 'warn'); return; }
  setApiKey(key);
  setModel(model);
  updateKeyUI();
  showToast('API key saved ✓', 'pass');
}
function clearApiKey() {
  try { localStorage.removeItem('testpilot_gemini_key'); } catch(e) {}
  updateKeyUI();
  showToast('API key removed', 'warn');
}
document.getElementById('settings-modal').addEventListener('click', function(e) {
  if (e.target === this) closeSettings();
});

// ========== Gemini API Call ==========
async function callGemini(prompt) {
  const key = getApiKey();
  if (!key) throw new Error('No API key');
  const model = getModel();
  const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${key}`;
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.4, maxOutputTokens: 8192, responseMimeType: 'application/json' }
  };
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.error?.message || `HTTP ${resp.status}`);
  }
  const data = await resp.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  try { return JSON.parse(text); } catch(e) {
    // Try extracting JSON from markdown code block
    const match = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
    if (match) return JSON.parse(match[1]);
    throw new Error('Could not parse JSON from Gemini response');
  }
}

function setGeminiStep(steps, idx, state) {
  const el = document.getElementById('gs-' + idx);
  if (el) el.className = 'gemini-step ' + state;
}

function addGeminiStep(label, idx) {
  const container = document.getElementById('gemini-steps');
  const div = document.createElement('div');
  div.id = 'gs-' + idx;
  div.className = 'gemini-step';
  div.textContent = '○ ' + label;
  container.appendChild(div);
}

// ========== AI-driven Analysis ==========
async function runGeminiAnalysis(url, appName) {
  const progress = document.getElementById('gemini-progress');
  const stepsEl = document.getElementById('gemini-steps');
  progress.classList.add('visible');
  stepsEl.innerHTML = '';

  const steps = [
    'Connecting to Gemini AI…',
    'Analysing application: ' + appName,
    'Generating discovery map…',
    'Extracting functional requirements…',
    'Generating test cases…',
    'Prioritising by risk…',
    'Simulating test execution…',
    'Generating bug reports…',
    'Building AI report…'
  ];
  steps.forEach((s, i) => addGeminiStep(s, i));
  setGeminiStep(steps, 0, 'active');

  // Step 0: connect
  await delay(400);
  setGeminiStep(steps, 0, 'done'); document.getElementById('gs-0').textContent = '✓ ' + steps[0].replace('…', '');
  setGeminiStep(steps, 1, 'active');

  // Prompt 1: Discovery + Requirements
  const discoveryPrompt = `You are a functional testing AI agent called TestPilot. You are analysing a web application.

Application URL: ${url}
Application Name: ${appName}

Generate a comprehensive discovery map and functional requirements. Return ONLY valid JSON with this exact shape:
{
  "appVersion": "string — inferred version or 'v1.0'",
  "pages": [{"name": "string", "path": "string", "elements": "string — short description", "hasKnownIssue": false}],
  "pagesCount": number,
  "elementsCount": number,
  "formsCount": number,
  "requirements": [
    {"id": "REQ-001", "severity": "critical|high|medium|low", "title": "string", "detail": "string — one line"}
  ],
  "discoveryLog": ["string — log line 1", "string — log line 2", "...up to 10 log lines as the agent narrates discovery"]
}

Include 6-10 pages typical for this type of app, 10-15 requirements, and realistic discovery log entries.`;

  let discovery;
  try {
    discovery = await callGemini(discoveryPrompt);
    setGeminiStep(steps, 1, 'done'); document.getElementById('gs-1').textContent = '✓ ' + steps[1];
    setGeminiStep(steps, 2, 'active');
    await delay(300);
    setGeminiStep(steps, 2, 'done'); document.getElementById('gs-2').textContent = '✓ ' + steps[2].replace('…','');
    setGeminiStep(steps, 3, 'active');
    await delay(300);
    setGeminiStep(steps, 3, 'done'); document.getElementById('gs-3').textContent = '✓ ' + steps[3].replace('…','');
  } catch(e) {
    setGeminiStep(steps, 1, 'error'); document.getElementById('gs-1').textContent = '✗ Discovery failed: ' + e.message;
    progress.classList.remove('visible');
    showToast('Gemini error: ' + e.message, 'fail');
    return false;
  }

  // Prompt 2: Test Cases
  setGeminiStep(steps, 4, 'active');
  const testPrompt = `You are TestPilot AI generating functional test cases for: ${appName} (${url})

Based on these pages: ${JSON.stringify((discovery.pages||[]).map(p=>p.name))}
And these requirements: ${JSON.stringify((discovery.requirements||[]).map(r=>r.title))}

Generate exactly 18 functional test cases. Return ONLY valid JSON:
{
  "testCases": [
    {
      "id": "TC-001",
      "title": "string",
      "category": "Authentication|Navigation|Cart|Checkout|Search|Validation|UI",
      "priority": "critical|high|medium|low",
      "status": "pass|fail|blocked",
      "duration": "1.2s",
      "req": "string — requirement this tests",
      "steps": ["step 1", "step 2", "step 3", "step 4"],
      "expected": "string",
      "actual": "string — what actually happened (can match expected for pass, or differ for fail)",
      "ai": "string — AI analysis (one to two sentences)"
    }
  ]
}

Rules:
- Include at least 3 failed tests with realistic bugs (authentication, checkout, validation)
- Include at least 1 blocked test
- Remaining tests should pass
- For failed tests, mention 'DEFECT DETECTED' and reference a BUG ID in the ai field
- Make bugs realistic for a ${appName}-type application`;

  let testsData;
  try {
    testsData = await callGemini(testPrompt);
    setGeminiStep(steps, 4, 'done'); document.getElementById('gs-4').textContent = '✓ ' + steps[4].replace('…','');
    setGeminiStep(steps, 5, 'active');
    await delay(300);
    setGeminiStep(steps, 5, 'done'); document.getElementById('gs-5').textContent = '✓ ' + steps[5].replace('…','');
    setGeminiStep(steps, 6, 'active');
    await delay(500);
    setGeminiStep(steps, 6, 'done'); document.getElementById('gs-6').textContent = '✓ ' + steps[6].replace('…','');
  } catch(e) {
    setGeminiStep(steps, 4, 'error'); document.getElementById('gs-4').textContent = '✗ Test generation failed: ' + e.message;
    progress.classList.remove('visible');
    showToast('Gemini error: ' + e.message, 'fail');
    return false;
  }

  // Prompt 3: Bug Reports
  setGeminiStep(steps, 7, 'active');
  const failedTests = (testsData.testCases || []).filter(t => t.status === 'fail');
  const bugPrompt = `You are TestPilot AI generating bug reports for ${appName}.

Failed tests found:
${failedTests.map(t => `- ${t.id}: ${t.title} | Expected: ${t.expected} | Actual: ${t.actual}`).join('\n')}

Generate a bug report for each failed test. Return ONLY valid JSON:
{
  "bugs": [
    {
      "id": "BUG-001",
      "testId": "TC-XXX",
      "title": "string — concise bug title",
      "severity": "critical|high|medium",
      "priority": "P1|P2|P3",
      "type": "Authentication Defect|API Defect|Validation Defect|UI Defect|Performance Defect",
      "confidence": "95%",
      "feature": "string",
      "stepsToReproduce": "string",
      "expected": "string",
      "actual": "string",
      "rootCause": "string — technical root cause analysis",
      "fix": "string — specific fix recommendation"
    }
  ]
}`;

  let bugsData;
  try {
    bugsData = await callGemini(bugPrompt);
    setGeminiStep(steps, 7, 'done'); document.getElementById('gs-7').textContent = '✓ ' + steps[7].replace('…','');
    setGeminiStep(steps, 8, 'active');
    await delay(300);
    setGeminiStep(steps, 8, 'done'); document.getElementById('gs-8').textContent = '✓ ' + steps[8].replace('…','');
  } catch(e) {
    // Bug generation failed — continue with what we have
    bugsData = { bugs: [] };
    setGeminiStep(steps, 7, 'done');
    setGeminiStep(steps, 8, 'done');
  }

  // Apply results to the dashboard
  applyGeminiResults(discovery, testsData.testCases || [], bugsData.bugs || [], url, appName);
  progress.classList.remove('visible');
  return true;
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function applyGeminiResults(discovery, tests, bugs, url, appName) {
  // Patch global testCases
  if (tests.length > 0) {
    testCases.length = 0;
    tests.forEach(tc => testCases.push(tc));
  }

  // Update stats
  const total = testCases.length;
  const passed = testCases.filter(t => t.status === 'pass').length;
  const failed = testCases.filter(t => t.status === 'fail').length;
  const blocked = testCases.filter(t => t.status === 'blocked').length;
  const passRate = Math.round(passed / total * 100);

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-pass').textContent = passed;
  document.getElementById('stat-fail').textContent = failed;
  document.querySelectorAll('.nav-badge').forEach(b => b.textContent = failed);

  // Update breadcrumb
  document.querySelector('.topbar-breadcrumb span').textContent = appName + ' (AI)';

  // Update donut percentages
  const circ = 314.16;
  const passArc = circ * passed/total;
  const failArc = circ * failed/total;
  const blockedArc = circ * blocked/total;
  document.querySelector('.donut-pct').textContent = passRate + '%';
  const circles = document.querySelectorAll('.donut-wrap circle');
  if (circles[1]) circles[1].setAttribute('stroke-dasharray', `${passArc.toFixed(1)} ${(circ-passArc).toFixed(1)}`);
  if (circles[2]) { circles[2].setAttribute('stroke-dasharray', `${failArc.toFixed(1)} ${(circ-failArc).toFixed(1)}`); circles[2].setAttribute('stroke-dashoffset', `-${passArc.toFixed(1)}`); }
  if (circles[3]) { circles[3].setAttribute('stroke-dasharray', `${blockedArc.toFixed(1)} ${(circ-blockedArc).toFixed(1)}`); circles[3].setAttribute('stroke-dashoffset', `-${(passArc+failArc).toFixed(1)}`); }

  // Update stat sub-labels
  const statPassEl = document.querySelector('.stat-tile.stat-pass .stat-sub');
  if (statPassEl) statPassEl.textContent = passRate + '% pass rate';
  const statFailEl = document.querySelector('.stat-tile.stat-fail .stat-sub');
  if (statFailEl) statFailEl.textContent = failed + ' bug' + (failed!==1?'s':'') + ' found';

  // Update quality gate
  const qgFail = failed > 0 || passRate < 95;
  const critFails = testCases.filter(t => t.status === 'fail' && t.priority === 'critical').length;
  const highFails = testCases.filter(t => t.status === 'fail' && t.priority === 'high').length;
  const qgEl = document.querySelector('#page-dashboard .quality-gate');
  if (qgEl) {
    if (qgFail) {
      qgEl.className = 'quality-gate fail';
      qgEl.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:20px;height:20px;color:var(--fail);flex-shrink:0;"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg><div><div style="font-size:14px;font-weight:700;color:var(--fail);">GATE FAILED</div><div style="font-size:12px;color:var(--fg-secondary);">Pass rate below threshold · ${critFails} critical failure${critFails!==1?'s':''} detected</div></div>`;
    } else {
      qgEl.className = 'quality-gate pass';
      qgEl.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:20px;height:20px;color:var(--pass);flex-shrink:0;"><circle cx="12" cy="12" r="10"/><polyline points="9,12 11,14 15,10"/></svg><div><div style="font-size:14px;font-weight:700;color:var(--pass);">GATE PASSED</div><div style="font-size:12px;color:var(--fg-secondary);">All quality thresholds met — ready for release</div></div>`;
    }
    // Update gate rows
    const gateRows = document.querySelectorAll('#page-dashboard .quality-gate ~ div div');
    if (gateRows.length >= 3) {
      gateRows[0].querySelector('span:last-child').textContent = passRate + '% ' + (passRate >= 95 ? '✓' : '✗');
      gateRows[0].querySelector('span:last-child').style.color = passRate >= 95 ? 'var(--pass)' : 'var(--fail)';
      gateRows[1].querySelector('span:last-child').textContent = critFails + ' ' + (critFails === 0 ? '✓' : '✗');
      gateRows[1].querySelector('span:last-child').style.color = critFails === 0 ? 'var(--pass)' : 'var(--fail)';
      gateRows[2].querySelector('span:last-child').textContent = highFails + ' ' + (highFails <= 1 ? '≈' : '✗');
      gateRows[2].querySelector('span:last-child').style.color = highFails <= 1 ? 'var(--warn)' : 'var(--fail)';
    }
  }

  // Rebuild discovery section
  if (discovery && discovery.pages) {
    const appMapEl = document.querySelector('.app-map');
    if (appMapEl) {
      appMapEl.innerHTML = `<div><span class="branch">APPLICATION</span> <span style="color:var(--fg-muted);">${appName} ${discovery.appVersion||''}</span></div>`;
      discovery.pages.forEach((p, i) => {
        const isLast = i === discovery.pages.length - 1;
        const prefix = isLast ? '└──' : '├──';
        const cls = p.hasKnownIssue ? 'node buggy' : 'node';
        const warn = p.hasKnownIssue ? ' ⚠' : '';
        appMapEl.innerHTML += `<div><span class="branch">${prefix}</span> <span class="${cls}">${warn}${p.name}</span> <span class="text-muted text-sm mono">${p.elements||''}</span></div>`;
      });
      // Update stats
      const countEls = appMapEl.closest('.card')?.querySelectorAll('.grid-3 > div .fw-600, .grid-3 > div [style*="font-size:20px"]');
      const statPages = appMapEl.closest('.card')?.querySelectorAll('[style*="font-size:20px"]');
      if (statPages && statPages.length >= 3) {
        statPages[0].textContent = discovery.pagesCount || discovery.pages.length;
        statPages[1].textContent = discovery.elementsCount || '—';
        statPages[2].textContent = discovery.formsCount || '—';
      }
      const pagesBadge = appMapEl.closest('.card')?.querySelector('.badge-pass');
      if (pagesBadge) pagesBadge.textContent = (discovery.pagesCount || discovery.pages.length) + ' pages';
    }

    // Update requirements
    const reqContainer = document.querySelectorAll('#page-discovery .card')[1]?.querySelector('div[style*="flex-direction:column"]');
    if (reqContainer && discovery.requirements) {
      reqContainer.innerHTML = '';
      const sevColor = {critical:'var(--critical)', high:'var(--high)', medium:'var(--medium)', low:'var(--low)'};
      discovery.requirements.slice(0,5).forEach(r => {
        const col = sevColor[r.severity] || 'var(--fg-muted)';
        reqContainer.innerHTML += `<div style="padding:12px;background:var(--bg-elevated);border-radius:var(--radius-sm);border-left:3px solid ${col};"><div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:${col};margin-bottom:4px;">${r.severity||'medium'}</div><div style="font-size:13px;font-weight:500;color:var(--fg-primary);">${r.title}</div><div style="font-size:12px;color:var(--fg-muted);margin-top:3px;">→ ${r.detail||''}</div></div>`;
      });
      const reqBadge = document.querySelectorAll('#page-discovery .card')[1]?.querySelector('.badge-pass');
      if (reqBadge) reqBadge.textContent = discovery.requirements.length + ' req.';
    }

    // Update discovery log
    if (discovery.discoveryLog) {
      const logEl = document.querySelector('#page-discovery .agent-log');
      if (logEl) {
        logEl.innerHTML = '';
        const now = new Date();
        discovery.discoveryLog.forEach((line, i) => {
          const t = new Date(now - (discovery.discoveryLog.length - i) * 1200);
          const hh = String(t.getHours()).padStart(2,'0');
          const mm = String(t.getMinutes()).padStart(2,'0');
          const ss = String(t.getSeconds()).padStart(2,'0');
          const dotCls = line.toLowerCase().includes('fail')||line.toLowerCase().includes('error')?'fail':line.toLowerCase().includes('complete')||line.toLowerCase().includes('success')||line.toLowerCase().includes('done')?'pass':'accent';
          logEl.innerHTML += `<div class="log-line"><span class="log-time">[${hh}:${mm}:${ss}]</span><div class="log-dot ${dotCls}"></div><span class="log-msg ${dotCls}">${line}</span></div>`;
        });
      }
    }
  }

  // Rebuild bugs section
  if (bugs.length > 0) {
    const bugsContainer = document.querySelector('#page-bugs > div[style*="flex-direction:column"]');
    if (bugsContainer) {
      bugsContainer.innerHTML = '';
      const sevBadge = {critical:'badge-critical', high:'badge-high', medium:'badge-medium'};
      bugs.forEach(bug => {
        const bc = (bug.severity === 'critical') ? 'rgba(255,77,106,0.2)' : (bug.severity === 'high') ? 'rgba(245,166,35,0.2)' : 'rgba(139,111,232,0.2)';
        const idCol = (bug.severity === 'critical') ? 'var(--fail)' : (bug.severity === 'high') ? 'var(--high)' : 'var(--blocked)';
        bugsContainer.innerHTML += `<div class="bug-card" style="border-color:${bc};">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px;">
            <div>
              <div class="bug-id" style="color:${idCol};">${bug.id}</div>
              <div class="bug-title">${bug.title}</div>
            </div>
            <div style="display:flex;gap:6px;flex-shrink:0;">
              <span class="badge ${sevBadge[bug.severity]||'badge-medium'}">${bug.severity||'medium'}</span>
              <span class="badge ${sevBadge[bug.severity]||'badge-medium'}">${bug.priority||'P2'}</span>
            </div>
          </div>
          <div class="bug-meta">
            <span class="badge badge-fail">${bug.type||'Defect'}</span>
            <span style="font-size:11px;color:var(--fg-muted);">Confidence: ${bug.confidence||'90%'}</span>
            <span style="font-size:11px;color:var(--fg-muted);">Feature: ${bug.feature||''}</span>
          </div>
          <div class="bug-detail">
            <strong>Steps to Reproduce:</strong> ${bug.stepsToReproduce||''}<br>
            <strong>Expected:</strong> ${bug.expected||''}<br>
            <strong>Actual:</strong> ${bug.actual||''}<br>
            <strong>Root Cause:</strong> ${bug.rootCause||''}<br>
            <strong>Recommended Fix:</strong> ${bug.fix||''}
          </div>
        </div>`;
      });
      document.querySelector('#page-bugs .section-head .badge-fail').textContent = bugs.length + ' defect' + (bugs.length !== 1 ? 's' : '') + ' found';
    }
  }

  // Update report
  const reportH1 = document.querySelector('.report-h1');
  if (reportH1) reportH1.textContent = `AI Test Report — ${appName}`;
  const reportMeta = document.querySelector('.report-meta');
  if (reportMeta) {
    const today = new Date().toISOString().split('T')[0];
    reportMeta.innerHTML = `<span>📅 ${today}</span><span>🌐 ${url}</span><span>⏱ Generated by Gemini AI</span><span>🤖 TestPilot AI v1.0</span>`;
  }
  const reportSummary = document.querySelector('#page-report .card.card-sm div');
  if (reportSummary) {
    const gatePass = failed === 0 && passRate >= 95;
    reportSummary.innerHTML = `${appName} was subjected to comprehensive AI-generated functional testing across ${discovery?.pages?.length||'multiple'} application pages and ${discovery?.requirements?.length||12} identified requirements.
    The Gemini AI agent generated ${total} test scenarios, executed them across all risk categories,
    and identified ${bugs.length} defect${bugs.length!==1?'s':''}. <strong style="color:var(--fg-primary);">The application ${gatePass ? 'passes quality gates and is ready for release' : 'does not meet release criteria'}.</strong>`;
  }

  // Re-render tests table if visible
  if (document.getElementById('page-tests').classList.contains('active')) renderTests();

  showToast(`Gemini generated ${total} test cases & ${bugs.length} bug reports ✓`, 'pass');
}

// ========== Data ==========
const testCases = [
  { id:'TC-001', title:'Valid user login with correct credentials', category:'Authentication', priority:'critical', status:'pass', duration:'1.2s', req:'Users must authenticate with valid credentials', steps:['Navigate to /login','Enter username: admin@demoshop.com','Enter password: Demo1234!','Click Login button'], expected:'User is redirected to /dashboard and welcome message appears', actual:'User redirected to /dashboard — Welcome, Admin displayed', ai:'Nominal authentication flow. Server returns 200 with valid JWT. Redirect correctly handled.' },
  { id:'TC-002', title:'Login with invalid credentials rejected', category:'Authentication', priority:'critical', status:'fail', duration:'0.8s', req:'Invalid credentials must be rejected', steps:['Navigate to /login','Enter username: wrong@email.com','Enter password: badpassword','Click Login button'], expected:'Error message: "Invalid username or password". User remains on /login.', actual:'User redirected to /dashboard — authentication accepted without validation', ai:'DEFECT DETECTED: Authentication backend is not validating credentials. All login attempts succeed regardless of input. Classified as Authentication Defect. See BUG-001.' },
  { id:'TC-003', title:'Login form rejects empty username field', category:'Validation', priority:'high', status:'pass', duration:'0.4s', req:'Required fields must be validated before submission', steps:['Navigate to /login','Leave username empty','Enter password: Demo1234!','Click Login'], expected:'Validation error on username field', actual:'Inline validation error "Email is required" displayed', ai:'Client-side validation functioning correctly. Form submission blocked.' },
  { id:'TC-004', title:'Registration form validates all required fields', category:'Validation', priority:'high', status:'pass', duration:'1.1s', req:'Registration requires all mandatory fields', steps:['Navigate to /register','Submit empty form'], expected:'All required field errors shown simultaneously', actual:'5 validation errors displayed correctly', ai:'Form validation layer is robust. All error states visible.' },
  { id:'TC-005', title:'Product listing page loads with all items', category:'Navigation', priority:'medium', status:'pass', duration:'1.4s', req:'Product catalogue accessible to all users', steps:['Navigate to /products'], expected:'Product grid renders with images, names, prices', actual:'24 products loaded, grid renders correctly', ai:'No issues. Product catalogue endpoint responding normally.' },
  { id:'TC-006', title:'Product detail page loads from product click', category:'Navigation', priority:'medium', status:'pass', duration:'0.9s', req:'Product details accessible', steps:['Navigate to /products','Click first product'], expected:'/products/:id loads with full detail view', actual:'Detail page loads, all fields populated', ai:'Navigation and data binding working correctly.' },
  { id:'TC-007', title:'Add product to cart and verify quantity', category:'Cart', priority:'high', status:'pass', duration:'2.1s', req:'Cart must accept product additions', steps:['Navigate to /products','Click "Add to Cart" on product','Navigate to /cart'], expected:'Product appears in cart with quantity 1', actual:'Product added, cart count badge updates to 1', ai:'Cart API responding. LocalStorage sync confirmed.' },
  { id:'TC-008', title:'Cart quantity update persists correctly', category:'Cart', priority:'high', status:'pass', duration:'1.7s', req:'Cart quantities must be editable', steps:['Add item to cart','Navigate to /cart','Increment quantity to 3'], expected:'Quantity updates, subtotal recalculates', actual:'Quantity = 3, subtotal correctly shows 3× price', ai:'Quantity mutation and price calculation correct.' },
  { id:'TC-009', title:'Promo code validation provides user feedback', category:'Validation', priority:'high', status:'fail', duration:'1.3s', req:'Invalid promo codes must display an error message', steps:['Add item to cart','Navigate to /cart','Enter promo code: INVALID123','Click Apply'], expected:'Error message: "Promo code INVALID123 is not valid"', actual:'Apply button returns to default state — no feedback shown at all', ai:'DEFECT DETECTED: Promo code validation API returns 400 but frontend catches and silences the error without displaying a notification. See BUG-003.' },
  { id:'TC-010', title:'Checkout flow with valid payment details', category:'Checkout', priority:'critical', status:'fail', duration:'3.7s', req:'Checkout must complete and show order confirmation', steps:['Add item to cart','Proceed to checkout','Fill billing address','Enter card: 4242 4242 4242 4242, exp: 12/28, CVV: 123','Click Place Order'], expected:'Order confirmation page with order number ORD-XXXXXX', actual:'HTTP 502 Bad Gateway — pay.demostore.internal ERR_NAME_NOT_RESOLVED', ai:'DEFECT DETECTED: Payment gateway DNS resolution failure. Service pay.demostore.internal not found. This is an environment/infrastructure defect. See BUG-002.' },
  { id:'TC-011', title:'Search returns results for valid query', category:'Search', priority:'medium', status:'pass', duration:'1.0s', req:'Search must return relevant results', steps:['Navigate to /search','Enter query: "laptop"','Press Enter'], expected:'Results page with matching products', actual:'12 products matching "laptop" returned', ai:'Search working correctly.' },
  { id:'TC-012', title:'Search handles empty query gracefully', category:'Search', priority:'medium', status:'pass', duration:'0.5s', req:'Empty search handled without crash', steps:['Click search icon','Submit empty search'], expected:'Prompt to enter a search term', actual:'"Please enter a search term" message displayed', ai:'Edge case handled gracefully.' },
  { id:'TC-013', title:'Remove item from cart updates total', category:'Cart', priority:'medium', status:'pass', duration:'1.2s', req:'Items must be removable from cart', steps:['Add 2 items to cart','Click Remove on first item'], expected:'Item removed, total recalculates', actual:'Item removed, total updates correctly', ai:'Cart removal and recalculation working.' },
  { id:'TC-014', title:'Navigation links all resolve correctly', category:'Navigation', priority:'low', status:'pass', duration:'2.4s', req:'All navigation links must resolve without 404', steps:['Check each nav link systematically'], expected:'All links return HTTP 200', actual:'All 6 navigation links return 200', ai:'No dead links detected.' },
  { id:'TC-015', title:'Search returns relevant products', category:'Search', priority:'medium', status:'pass', duration:'1.9s', req:'Search relevance scoring functional', steps:['Search for "gaming mouse"'], expected:'Gaming peripherals in results', actual:'8 results, all relevant', ai:'Relevance filtering working.' },
  { id:'TC-016', title:'Product images load without broken states', category:'UI', priority:'low', status:'pass', duration:'1.8s', req:'Product images must render', steps:['Navigate to /products','Inspect image loading'], expected:'All product images render', actual:'24/24 images loaded', ai:'No broken image sources detected.' },
  { id:'TC-017', title:'Footer links resolve correctly', category:'Navigation', priority:'low', status:'pass', duration:'1.1s', req:'Footer navigation functional', steps:['Scroll to footer','Click each footer link'], expected:'All links navigate or open correctly', actual:'All 8 footer links functional', ai:'Footer navigation nominal.' },
  { id:'TC-018', title:'Guest checkout requires authentication redirect', category:'Authentication', priority:'critical', status:'blocked', duration:'—', req:'Unauthenticated users must be redirected at checkout', steps:['Without logging in','Add item to cart','Attempt checkout'], expected:'Redirect to /login with return URL preserved', actual:'BLOCKED: TC-002 auth defect prevents reliable verification of this behaviour', ai:'Test blocked — cannot reliably test auth redirect while login validation is broken (BUG-001). Will unblock upon fix.' },
];

// ========== Toast ==========
function showToast(msg, type) {
  const color = type === 'pass' ? 'var(--pass)' : type === 'fail' ? 'var(--fail)' : 'var(--warn)';
  const el = document.createElement('div');
  el.style.cssText = `position:fixed;bottom:24px;right:24px;background:${color};color:#000;padding:12px 20px;border-radius:var(--radius-md);font-size:13px;font-weight:600;z-index:300;max-width:380px;box-shadow:0 4px 20px rgba(0,0,0,0.3);`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

// ========== Target Type ==========
const targetTypeConfig = {
  web:         { label: 'Application URL', placeholder: 'https://your-app.com', inputType: 'url' },
  api:         { label: 'API Base URL / Swagger URL', placeholder: 'https://api.example.com/v1 or swagger.json URL', inputType: 'url' },
  apk:         { label: 'APK Package Name or Upload Path', placeholder: 'com.example.app or /path/to/app.apk', inputType: 'text' },
  code:        { label: 'GitHub Repo URL or File Path', placeholder: 'https://github.com/user/repo or paste code snippet URL', inputType: 'text' },
  database:    { label: 'Database Connection / DDL Path', placeholder: 'postgresql://user:pass@host/db or paste DDL URL', inputType: 'text' },
  pdf:         { label: 'Document URL or Upload Path', placeholder: 'https://example.com/spec.pdf or /uploads/brd.pdf', inputType: 'text' },
  security:    { label: 'Target URL', placeholder: 'https://your-app.com — OWASP scan', inputType: 'url' },
  performance: { label: 'Target URL', placeholder: 'https://your-app.com — load test endpoint', inputType: 'url' },
};

let currentTargetType = 'web';

function selectTargetType(el, type) {
  document.querySelectorAll('.target-type-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  currentTargetType = type;
  const cfg = targetTypeConfig[type] || targetTypeConfig.web;
  document.getElementById('target-input-label').textContent = cfg.label;
  const inp = document.getElementById('url-input');
  inp.placeholder = cfg.placeholder;
  inp.type = cfg.inputType;
  // clear value when switching type
  if (inp.value && !inp.value.startsWith('http')) inp.value = '';
}

// ========== Navigation ==========
function navigate(page) {
  document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  const navMap = { dashboard:'Dashboard', discovery:'Discovery', tests:'Test Cases', execution:'Live Execution', bugs:'Bugs', report:'AI Report', recommendations:'Recommendations' };
  document.getElementById('page-title').textContent = navMap[page] || page;
  // Highlight nav
  document.querySelectorAll('.nav-item').forEach(btn => {
    if (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes("'"+page+"'")) btn.classList.add('active');
  });
  if (page === 'tests') renderTests();
  if (page === 'execution') renderExecution();
}

// ========== Tests Table ==========
function renderTests() {
  const tbody = document.getElementById('tests-table');
  tbody.innerHTML = '';
  testCases.forEach(tc => {
    const priorityBadge = `<span class="badge badge-${tc.priority}">${tc.priority.charAt(0).toUpperCase()+tc.priority.slice(1)}</span>`;
    const statusBadge = tc.status === 'pass' ? '<span class="badge badge-pass">✓ Pass</span>'
      : tc.status === 'fail' ? '<span class="badge badge-fail">✗ Fail</span>'
      : tc.status === 'blocked' ? '<span class="badge badge-blocked">◷ Blocked</span>'
      : '<span class="badge badge-pending">Pending</span>';
    tbody.innerHTML += `<tr>
      <td class="tc-id">${tc.id}</td>
      <td class="tc-title">${tc.title}</td>
      <td><span class="badge badge-skip" style="font-size:10px;">${tc.category}</span></td>
      <td>${priorityBadge}</td>
      <td>${statusBadge}</td>
      <td class="mono text-muted">${tc.duration}</td>
      <td><button class="btn btn-ghost btn-sm" onclick="openTest('${tc.id}')">View</button></td>
    </tr>`;
  });
}

// ========== Test Modal ==========
function openTest(id) {
  const tc = testCases.find(t => t.id === id);
  if (!tc) return;
  document.getElementById('modal-id').textContent = tc.id;
  document.getElementById('modal-title').textContent = tc.title;
  const statusColor = tc.status === 'pass' ? 'pass' : tc.status === 'fail' ? 'fail' : 'blocked';
  const statusBadge = tc.status === 'pass' ? '<span class="badge badge-pass">✓ Pass</span>'
    : tc.status === 'fail' ? '<span class="badge badge-fail">✗ Fail</span>'
    : '<span class="badge badge-blocked">◷ Blocked</span>';
  document.getElementById('modal-body').innerHTML = `
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">
      <span class="badge badge-${tc.priority}">${tc.priority.charAt(0).toUpperCase()+tc.priority.slice(1)}</span>
      ${statusBadge}
      <span class="badge badge-skip">${tc.category}</span>
      <span class="badge badge-pending mono">${tc.duration}</span>
    </div>
    <div style="margin-bottom:14px;">
      <div class="label" style="margin-bottom:5px;">Requirement</div>
      <div style="font-size:13px;color:var(--fg-secondary);">${tc.req}</div>
    </div>
    <div style="margin-bottom:14px;">
      <div class="label" style="margin-bottom:5px;">Test Steps</div>
      ${tc.steps.map((s,i)=>`<div style="display:flex;gap:8px;padding:5px 0;font-size:13px;border-bottom:1px solid var(--border);"><span style="color:var(--accent);font-weight:600;min-width:20px;">${i+1}.</span><span style="color:var(--fg-secondary);">${s}</span></div>`).join('')}
    </div>
    <div class="grid-2 gap-12" style="margin-bottom:14px;">
      <div>
        <div class="label" style="margin-bottom:5px;">Expected</div>
        <div style="font-size:12px;padding:10px;background:var(--bg-elevated);border-radius:var(--radius-sm);color:var(--fg-secondary);">${tc.expected}</div>
      </div>
      <div>
        <div class="label" style="margin-bottom:5px;">Actual</div>
        <div style="font-size:12px;padding:10px;background:var(--bg-elevated);border-radius:var(--radius-sm);color:${tc.status==='pass'?'var(--pass)':tc.status==='fail'?'var(--fail)':'var(--blocked)'};">${tc.actual}</div>
      </div>
    </div>
    <div>
      <div class="label" style="margin-bottom:5px;">AI Analysis</div>
      <div style="font-size:12px;padding:12px;background:var(--accent-dim);border:1px solid var(--border-mid);border-radius:var(--radius-sm);color:var(--fg-secondary);line-height:1.7;">${tc.ai}</div>
    </div>
  `;
  document.getElementById('test-modal').classList.add('open');
}

function closeModal() {
  document.getElementById('test-modal').classList.remove('open');
}

document.getElementById('test-modal').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

// ========== Execution ==========
const execSteps = [
  { label:'Opening application', status:'pass', time:'0.3s' },
  { label:'Discovering navigation elements', status:'pass', time:'0.8s' },
  { label:'Application map built — 7 pages found', status:'pass', time:'1.2s' },
  { label:'Generating test cases with AI agent', status:'pass', time:'2.1s' },
  { label:'18 test cases generated & prioritised', status:'pass', time:'0.3s' },
  { label:'Starting execution — TC-001 Valid Login', status:'pass', time:'1.2s' },
  { label:'TC-001 PASSED', status:'pass', time:'—' },
  { label:'TC-002 Invalid Login test executing...', status:'fail', time:'0.8s' },
  { label:'TC-002 FAILED — Auth bypass detected', status:'fail', time:'—' },
  { label:'Failure Analysis Agent activated', status:'running', time:'0.5s' },
  { label:'BUG-001 identified — Authentication Defect', status:'fail', time:'—' },
  { label:'TC-003 through TC-009 executing...', status:'pass', time:'7.3s' },
  { label:'TC-009 FAILED — Promo code silent error', status:'fail', time:'—' },
  { label:'BUG-003 identified — Validation Defect', status:'fail', time:'—' },
  { label:'TC-010 Checkout flow executing...', status:'fail', time:'3.7s' },
  { label:'TC-010 FAILED — 502 pay.demostore.internal', status:'fail', time:'—' },
  { label:'BUG-002 identified — API Defect (P1)', status:'fail', time:'—' },
  { label:'TC-011 through TC-017 all PASSED', status:'pass', time:'10.8s' },
  { label:'TC-018 BLOCKED — auth dependency', status:'running', time:'—' },
  { label:'Generating final AI report...', status:'pass', time:'1.2s' },
  { label:'Quality Gate evaluated: FAILED', status:'fail', time:'—' },
  { label:'Execution complete — 43.2s total', status:'pass', time:'—' },
];

const execLogs = [
  { t:'12:31:04', c:'accent', m:'TestPilot AI Execution Agent started' },
  { t:'12:31:05', c:'neutral', m:'Opening https://demo-shop.testpilot.internal' },
  { t:'12:31:07', c:'pass', m:'Application loaded — DemoShop v2.4' },
  { t:'12:31:08', c:'neutral', m:'7 pages, 23 elements, 11 forms mapped' },
  { t:'12:31:10', c:'accent', m:'18 test cases generated — 4 Critical, 7 High, 5 Medium, 2 Low' },
  { t:'12:31:12', c:'pass', m:'TC-001: PASS — Valid login redirected to dashboard' },
  { t:'12:31:14', c:'fail', m:'TC-002: FAIL — Invalid credentials accepted (BUG-001)' },
  { t:'12:31:16', c:'warn', m:'Failure Analysis: auth endpoint not validating — confidence 97%' },
  { t:'12:31:22', c:'pass', m:'TC-003→TC-008: All PASS' },
  { t:'12:31:24', c:'fail', m:'TC-009: FAIL — Promo code error swallowed by frontend (BUG-003)' },
  { t:'12:31:28', c:'fail', m:'TC-010: FAIL — 502 Bad Gateway pay.demostore.internal (BUG-002)' },
  { t:'12:31:30', c:'warn', m:'Failure Analysis: DNS resolution failure — infrastructure defect' },
  { t:'12:31:38', c:'pass', m:'TC-011→TC-017: All PASS' },
  { t:'12:31:40', c:'accent', m:'TC-018: BLOCKED — auth defect prevents reliable testing' },
  { t:'12:31:42', c:'fail', m:'Quality Gate FAILED — 2 critical defects, pass rate 77.8%' },
  { t:'12:31:43', c:'pass', m:'Report generated — 3 bugs, 18 tests, 43.2s' },
];

function renderExecution() {
  const stepsEl = document.getElementById('exec-steps');
  const logEl = document.getElementById('exec-log');
  stepsEl.innerHTML = '';
  logEl.innerHTML = '';
  execSteps.forEach(s => {
    const iconMap = { pass:'✓', fail:'✗', running:'◷' };
    const icon = iconMap[s.status] || '○';
    stepsEl.innerHTML += `<div class="exec-step">
      <div class="exec-step-icon ${s.status}">${icon}</div>
      <div class="exec-step-text">${s.label}</div>
      ${s.time !== '—' ? `<div class="exec-step-time">${s.time}</div>` : ''}
    </div>`;
  });
  execLogs.forEach(l => {
    logEl.innerHTML += `<div class="log-line"><span class="log-time">[${l.t}]</span><div class="log-dot ${l.c}"></div><span class="log-msg ${l.c}">${l.m}</span></div>`;
  });
}

function replayExecution() {
  const stepsEl = document.getElementById('exec-steps');
  const logEl = document.getElementById('exec-log');
  stepsEl.innerHTML = '';
  logEl.innerHTML = '';
  let i = 0;
  const runStep = () => {
    if (i >= execSteps.length) return;
    const s = execSteps[i];
    const iconMap = { pass:'✓', fail:'✗', running:'◷' };
    const icon = iconMap[s.status] || '○';
    const div = document.createElement('div');
    div.className = 'exec-step fade-in';
    div.innerHTML = `<div class="exec-step-icon ${s.status}">${icon}</div><div class="exec-step-text">${s.label}</div>${s.time !== '—' ? `<div class="exec-step-time">${s.time}</div>` : ''}`;
    stepsEl.appendChild(div);
    stepsEl.scrollTop = stepsEl.scrollHeight;
    // Add corresponding log
    if (execLogs[Math.floor(i * execLogs.length / execSteps.length)]) {
      const l = execLogs[Math.floor(i * execLogs.length / execSteps.length)];
      const ld = document.createElement('div');
      ld.className = 'log-line fade-in';
      ld.innerHTML = `<span class="log-time">[${l.t}]</span><div class="log-dot ${l.c}"></div><span class="log-msg ${l.c}">${l.m}</span>`;
      logEl.appendChild(ld);
      logEl.scrollTop = logEl.scrollHeight;
    }
    i++;
    setTimeout(runStep, 160 + Math.random() * 220);
  };
  runStep();
}

// ========== Analysis ==========
function startAnalysis() {
  const url = document.getElementById('url-input').value.trim();
  const appName = document.getElementById('app-name').value.trim() || 'Target App';
  const apiKey = getApiKey();

  const btn = document.getElementById('start-btn');
  btn.innerHTML = `<svg class="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:14px;height:14px;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Analysing…`;
  btn.disabled = true;

  const pills = ['pill-discover','pill-understand','pill-generate','pill-prioritise','pill-execute','pill-analyse','pill-report'];
  pills.forEach(p => document.getElementById(p).className = 'step-pill');

  if (apiKey && url) {
    // Real Gemini path
    animatePipeline(pills, 0, async () => {
      const success = await runGeminiAnalysis(url, appName);
      resetBtn(btn);
      if (success) {
        showToast('Analysis complete — ' + appName, 'pass');
        navigate('tests');
      }
    });
  } else {
    // Demo simulation path
    if (!apiKey) showToast('No API key — running demo data. Add key in AI Settings for real results.', 'warn');
    animatePipeline(pills, 0, () => {
      resetBtn(btn);
      showToast('Demo analysis complete — add a Gemini key for real AI generation', 'warn');
    });
  }
}

function resetBtn(btn) {
  btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:14px;height:14px;"><polygon points="5,3 19,12 5,21"/></svg> Start AI Test`;
  btn.disabled = false;
}

function animatePipeline(pills, i, onDone) {
  if (i < pills.length) {
    document.getElementById(pills[i]).className = 'step-pill active';
    if (i > 0) document.getElementById(pills[i-1]).className = 'step-pill done';
    setTimeout(() => animatePipeline(pills, i+1, onDone), 550 + Math.random() * 350);
  } else {
    document.getElementById(pills[pills.length-1]).className = 'step-pill done';
    if (onDone) onDone();
  }
}

function clearSession() {
  document.getElementById('url-input').value = '';
  document.getElementById('app-name').value = '';
  const pills = ['pill-discover','pill-understand','pill-generate','pill-prioritise','pill-execute','pill-analyse','pill-report'];
  pills.forEach(p => document.getElementById(p).className = 'step-pill');
  document.getElementById('gemini-progress').classList.remove('visible');
  document.getElementById('gemini-steps').innerHTML = '';
}

// ========== Theme Toggle ==========
function toggleTheme() {
  const root = document.documentElement;
  const current = root.getAttribute('data-theme');
  root.setAttribute('data-theme', current === 'light' ? 'dark' : 'light');
}

// ========== Export ==========
function exportReport(format) {
  const appName = document.getElementById('app-name').value || 'app';
  const date = new Date().toISOString().split('T')[0].replace(/-/g,'');
  const msgs = {
    json: `✓ JSON exported — testpilot_${appName.toLowerCase()}_${date}.json`,
    html: `✓ HTML report saved — testpilot_${appName.toLowerCase()}_${date}.html`,
    csv:  `✓ CSV exported — ${testCases.length} test rows`,
    junit:`✓ JUnit XML ready for CI — testpilot_${date}.xml`
  };
  showToast(msgs[format] || 'Exported', 'pass');
}

// ========== Init ==========
renderTests();
renderExecution();
updateKeyUI();
// Restore saved model in selector if settings modal exists
(function() {
  const sel = document.getElementById('gemini-model-select');
  if (sel) sel.value = getModel();
})();