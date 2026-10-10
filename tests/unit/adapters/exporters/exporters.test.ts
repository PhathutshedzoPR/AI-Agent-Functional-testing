import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import {
  JUnitExporter,
  JsonExporter,
  MarkdownExporter,
  PlaywrightSpecExporter,
  createDefaultExporters,
  locatorCode,
  mdEscape,
  reportFileName,
  textPattern,
  xmlEscape,
} from '@/adapters/exporters';
import { EMPTY_RUN_VIEW, type RunView } from '@/core/domain';
import { aRoleLocator } from '../../../fakes/domainBuilders';
import { sampleRunView } from '../../../fakes/sampleRun';

const view = sampleRunView();

describe('textPattern', () => {
  const matches = (expected: string, actual: string): boolean =>
    new RegExp(textPattern(expected), 'i').test(actual);

  it('accepts what the agent accepts: spacing, case and rand formats', () => {
    expect(matches('Total R 70,00', 'TOTAL\nR 70,00')).toBe(true);
    expect(matches('Total R70.00', 'Total R 70,00')).toBe(true);
    expect(matches('R 1 234,50', 'R1,234.50')).toBe(true);
    expect(matches('Total R 70,00', 'Total R 35,00')).toBe(false);
  });

  it('escapes regex characters in ordinary text', () => {
    expect(matches('Price (incl. VAT)?', 'price (incl. vat)?')).toBe(true);
    expect(matches('a.c', 'abc')).toBe(false);
  });
});

describe('reportFileName', () => {
  it('builds a safe slug from the label and run id', () => {
    expect(reportFileName(view, 'xml')).toBe('testpilot-kota-express-buggy-00000000.xml');
    expect(reportFileName(EMPTY_RUN_VIEW, 'md')).toBe('testpilot-run-unknown.md');
    expect(reportFileName(sampleRunView({ label: '../../%%' }), 'json')).toBe(
      'testpilot-run-00000000.json',
    );
  });
});

describe('JsonExporter', () => {
  it('exports the facts of the run without the live feed', () => {
    const report = new JsonExporter().export(view);
    const parsed = JSON.parse(report.body) as Record<string, unknown>;

    expect(report.contentType).toContain('application/json');
    expect(parsed).toMatchObject({
      generator: 'TestPilot',
      status: 'failed',
      criteria: ['Total is right'],
    });
    expect(parsed).not.toHaveProperty('feed');
  });
});

describe('JUnitExporter', () => {
  const xml = new JUnitExporter().export(view).body;

  it('writes one test case per scenario with counts and timing', () => {
    expect(xml).toContain(
      '<testsuites name="TestPilot" tests="2" failures="1" errors="0" skipped="1" time="21.000">',
    );
    expect(xml).toContain('classname="happy"');
    expect(xml).toContain('<skipped message="The run ended before this scenario finished"/>');
    expect(xml).toContain('<property name="plan" value="replayed"/>');
  });

  it('puts the failing check and steps to reproduce in the failure', () => {
    expect(xml).toMatch(/<failure message="Expected the page to contain &quot;Total R 70,00&quot;/);
    expect(xml).toContain('3. Check that the page shows &quot;Total R 70,00&quot;');
  });

  it('lists healed steps for review and escapes everything from the run', () => {
    expect(xml).toContain('Healed (needs review): button &quot;Add to order&quot;');
    expect(xml).toContain('name="Order two &lt;kotas&gt; &amp; &quot;check&quot; out"');
    expect(xmlEscape(`<a href='x'>&</a>`)).toBe('&lt;a href=&apos;x&apos;&gt;&amp;&lt;/a&gt;');
  });
});

describe('MarkdownExporter', () => {
  const md = new MarkdownExporter().export(view).body;

  it('has a summary, a scenario table, issue-ready bugs, review items and findings', () => {
    expect(md).toContain('# TestPilot report: Kota Express \\(buggy\\)');
    expect(md).toContain('- Plan: replayed from a recording');
    expect(md).toContain('- LLM calls: 1 of 12');
    expect(md).toContain('| Scenario | Kind | Criterion | Result |');
    expect(md).toContain('### 1. Cart total ignores quantity');
    expect(md).toContain('1. Add two Quarter kotas');
    expect(md).toContain('## Needs review');
    expect(md).toContain(
      '- broken-link: http://localhost:3000/demo-shop/buggy/specials returned 404',
    );
  });

  it('traces each criterion to its scenarios, including ones nothing tested', () => {
    expect(md).toContain('## Traceability');
    expect(md).toContain('| Total is right | - | Not tested |');
    expect(md).toContain(
      '| Not linked to a criterion | Order two \\<kotas\\> & "check" out, Never ran | Failed |',
    );
  });

  it('neutralises Markdown from the page so links and tables cannot be injected', () => {
    expect(mdEscape('[click](javascript:alert(1)) | ![x](y)\nnext')).toBe(
      '\\[click\\]\\(javascript:alert\\(1\\)\\) \\| \\!\\[x\\]\\(y\\) next',
    );
    expect(new MarkdownExporter().export(EMPTY_RUN_VIEW).body).toContain('No bugs found.');
  });
});

describe('performance and security checks in the exports', () => {
  const checkout = 'http://localhost:3000/demo-shop/buggy/checkout';
  const audited: RunView = {
    ...view,
    pages: [
      {
        url: 'http://localhost:3000/demo-shop/buggy',
        title: 'Menu',
        audit: null,
        screenshotId: null,
      },
      {
        url: checkout,
        title: 'Checkout',
        screenshotId: null,
        audit: {
          url: checkout,
          checks: [
            {
              category: 'performance',
              name: 'Server answers quickly (time to first byte)',
              status: 'failed',
              actual: '1530 ms',
              expected: 'at most 800 ms',
            },
            {
              category: 'security',
              name: 'Served over HTTPS',
              status: 'skipped',
              actual: 'http on a local address',
              expected: 'https',
            },
            {
              category: 'security',
              name: 'Referrer Policy is set',
              status: 'passed',
              actual: 'no-referrer',
              expected: 'a referrer-policy header',
            },
          ],
        },
      },
    ],
  };

  it('adds a JUnit suite with one case per check, counted in the totals', () => {
    const xml = new JUnitExporter().export(audited).body;

    expect(xml).toContain('tests="5" failures="2" errors="0" skipped="2"');
    expect(xml).toContain(
      '<testsuite name="Performance and security" tests="3" failures="1" errors="0" skipped="1" time="0">',
    );
    expect(xml).toContain(
      '<failure message="Measured 1530 ms, expected at most 800 ms" type="performance"/>',
    );
    expect(xml).toContain('<skipped message="http on a local address"/>');
    expect(xml).not.toContain('Performance and security" tests="0"');
    expect(new JUnitExporter().export(view).body).not.toContain('Performance and security');
  });

  it('adds a Markdown table of every check with what was measured', () => {
    const md = new MarkdownExporter().export(audited).body;

    expect(md).toContain('## Performance and security');
    expect(md).toContain('1 of 3 checks failed.');
    expect(md).toContain(
      '| /demo-shop/buggy/checkout | Server answers quickly \\(time to first byte\\) | failed | 1530 ms | at most 800 ms |',
    );
  });
});

describe('PlaywrightSpecExporter', () => {
  const spec = new PlaywrightSpecExporter().export(view).body;

  it('runs a phone run on the same profile, in Chromium like TestPilot did', () => {
    const phone = new PlaywrightSpecExporter().export({ ...view, device: 'iphone' }).body;

    expect(phone).toContain("import { devices, expect, test } from '@playwright/test';");
    expect(phone).toContain(
      `test.use({ ...devices["iPhone 15"], defaultBrowserType: 'chromium' });`,
    );
    expect(spec).not.toContain('devices[');
    expect(new MarkdownExporter().export({ ...view, device: 'android' }).body).toContain(
      "- Screen: Android phone (412 x 839, Playwright's Pixel 7 profile in Chromium)",
    );
  });

  it('generates a test per scenario with real Playwright calls', () => {
    expect(spec).toContain("import { expect, test } from '@playwright/test';");
    expect(spec).toContain('test.describe("Kota Express (buggy)", () => {');
    expect(spec).toContain('await page.goto("http://localhost:3000/demo-shop/buggy");');
    expect(spec).toContain('await page.getByLabel("Full name", { exact: false }).fill("Thandi");');
    expect(spec).toContain('.toContainText(new RegExp(');
  });

  it('uses the healed locator, so the spec runs against the current UI', () => {
    expect(spec).toContain(
      'page.getByRole("article").filter({ hasText: "Quarter Kota" }).getByRole("button", { name: "Add to bag", exact: true }).click();',
    );
  });

  it('is valid TypeScript even when page text tries to break out of strings and comments', () => {
    // U+2028 and U+2029 end a line comment in JavaScript, so they are the classic way out.
    const [lineSeparator, paragraphSeparator] = [
      String.fromCharCode(0x2028),
      String.fromCharCode(0x2029),
    ];
    const pageText = `"); process.exit(1); ("${paragraphSeparator}`;
    const hostile = sampleRunView({
      label: `Shop${lineSeparator}process.exit(1)//`,
      pageText,
    });
    const code = new PlaywrightSpecExporter().export(hostile).body;
    const output = ts.transpileModule(code, { reportDiagnostics: true });

    expect(output.diagnostics ?? []).toEqual([]);
    expect(code).toContain(`test(${JSON.stringify(pageText)}, async ({ page }) => {`);
    expect(code.includes(lineSeparator) && !code.includes(JSON.stringify(pageText))).toBe(false);
    expect(code.split(String.fromCharCode(10))[0]).toContain('Shop process.exit(1)//');
  });

  it('maps every locator strategy to code', () => {
    expect(
      locatorCode({ by: 'placeholder', value: '082', role: null, exact: true, within: null }),
    ).toBe('page.getByPlaceholder("082", { exact: true })');
    expect(locatorCode({ by: 'text', value: 'Hi', role: null, exact: false, within: null })).toBe(
      'page.getByText("Hi", { exact: false })',
    );
    expect(
      locatorCode({ by: 'testId', value: 'cart', role: null, exact: false, within: null }),
    ).toBe('page.getByTestId("cart")');
    expect(locatorCode(aRoleLocator('link', 'Cart'))).toBe(
      'page.getByRole("link", { name: "Cart", exact: false })',
    );
    const toggle = aRoleLocator('checkbox', '', { within: { role: 'listitem', hasText: 'Milk' } });
    expect(locatorCode(toggle)).toBe(
      'page.getByRole("listitem").filter({ hasText: "Milk" }).getByRole("checkbox")',
    );
  });
});

describe('createDefaultExporters', () => {
  it('offers every export format once', () => {
    expect(createDefaultExporters().map((exporter) => exporter.format)).toEqual([
      'json',
      'junit',
      'markdown',
      'spec',
    ]);
  });
});
