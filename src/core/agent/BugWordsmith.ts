import type { BugReport, Scenario } from '../domain';
import { AppError } from '../errors';
import type { ILanguageModel } from '../ports';
import { REPORT_TEMPERATURE, ReportOutputSchema, buildReportPrompt } from '../prompts';

const MAX_TITLE_CHARS = 100;

/**
 * One batched LLM call that rewrites bug titles in plain words. It only touches titles: every
 * verdict, step and piece of evidence stays as the browser recorded it. If the call fails, the
 * template titles stay.
 */
export class BugWordsmith {
  async reword(
    bugs: readonly BugReport[],
    scenarios: readonly Scenario[],
    llm: ILanguageModel,
  ): Promise<BugReport[]> {
    if (bugs.length === 0) return [];
    // Positional ids keep the prompt free of UUIDs, so its replay key is stable between runs.
    const promptBugs = bugs.map((bug, index) => ({
      id: `bug-${index + 1}`,
      scenario: scenarios.find((scenario) => scenario.id === bug.scenarioId)?.title ?? '',
      failedStep: bug.stepsToReproduce.at(-1) ?? '',
      expected: bug.expected,
      actual: bug.actual,
    }));
    const { system, prompt } = buildReportPrompt(promptBugs);
    let titles: ReadonlyMap<string, string>;
    try {
      const output = await llm.generateObject({
        purpose: 'report',
        system,
        prompt,
        schema: ReportOutputSchema,
        temperature: REPORT_TEMPERATURE,
      });
      titles = new Map(output.bugs.map((bug) => [bug.id, bug.title.trim()]));
    } catch (error) {
      if (AppError.is(error)) return [...bugs];
      throw error;
    }
    return bugs.map((bug, index) => {
      const title = titles.get(`bug-${index + 1}`);
      return title ? { ...bug, title: title.slice(0, MAX_TITLE_CHARS) } : bug;
    });
  }
}
