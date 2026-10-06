import { z } from 'zod';
import { ActionTypeSchema, PrioritySchema, ScenarioKindSchema } from '../domain';
import type { PageSnapshot } from '../ports';
import { ACTION_RULES, LOCATOR_RULES } from './promptRules';
import { ProposedLocatorSchema } from './proposedLocator';
import { UNTRUSTED_CONTENT_RULE, sitePath, wrapPageSnapshot } from './untrustedContent';

export const PLAN_TEMPERATURE = 0.2;

/** What the planner must return. Flat (no unions) and every key present, for every provider. */
export const PlanOutputSchema = z.object({
  summary: z.string().describe('One sentence on what the plan checks'),
  criteria: z
    .array(z.string())
    .describe('The acceptance criteria the plan covers: copied from the story, or proposed'),
  scenarios: z.array(
    z.object({
      title: z.string().describe('Short name, e.g. "Order two kotas and check out"'),
      kind: ScenarioKindSchema,
      criterion: z
        .string()
        .nullable()
        .describe('The criterion this scenario checks, copied exactly from "criteria"'),
      priority: PrioritySchema,
      steps: z.array(
        z.object({
          action: ActionTypeSchema,
          target: ProposedLocatorSchema.nullable(),
          value: z.string().nullable(),
          intent: z.string().describe('What this step does, in plain words'),
        }),
      ),
    }),
  ),
});

export type PlanOutput = z.infer<typeof PlanOutputSchema>;

export type PlanPromptInput = Readonly<{
  startUrl: string;
  story: string | null;
  criteria: readonly string[];
  pages: readonly PageSnapshot[];
  maxScenarios: number;
  maxSteps: number;
}>;

const SYSTEM = `You are the test planner inside TestPilot, an agent that tests websites in a real browser.
You write functional test plans. You never decide whether a test passes: a real browser runs every step and checks every assertion.

${UNTRUSTED_CONTENT_RULE}

Allowed actions:
- ${ACTION_RULES}

Locators:
- ${LOCATOR_RULES}

Scenarios:
- Mix happy-path, negative and edge-case scenarios.
- Every scenario runs in a fresh browser with empty storage, so start each one with a navigate step and repeat any setup it needs, such as adding items to a cart.
- End every scenario with an assertion on the outcome a user would see.
- Work out expected values from what the snapshots show. For example, if one item costs R 35,00, two of them cost R 70,00. Write rand amounts the way the site does, like "R 70,00".
- Never assert text, headings or URLs from a page that is not in the snapshots, such as a confirmation page that only appears after a form is submitted. Its wording is unknown, so a guess would fail for the wrong reason.
- To check that a form submission worked, assert that the form's submit button is now hidden (assertHidden). To check that a submission was refused, assert that the submit button is still visible (assertVisible). Do not guess error or success wording.
- You may assert text that appears in the snapshots, and values you can work out from them, such as totals.
- Use South African test data: names like Thandi Mokoena or Sipho Dlamini, cellphone numbers like 082 123 4567, Johannesburg street addresses.
- Only plan steps for pages and controls that appear in the snapshots or that a step in your plan leads to.`;

/** Builds a deterministic plan prompt: same site and story, same text (replay keys depend on it). */
export function buildPlanPrompt(
  input: PlanPromptInput,
): Readonly<{ system: string; prompt: string }> {
  const listed = input.criteria.map((criterion) => '- ' + criterion).join('\n');
  const criteria =
    input.criteria.length > 0
      ? `Acceptance criteria from the story:\n${listed}\nMap each scenario to one of these criteria.`
      : 'The story has no explicit acceptance criteria. Propose up to four short ones and map each scenario to one.';
  const origin = new URL(input.startUrl).origin;
  const prompt = [
    `Start page: ${sitePath(input.startUrl, origin)}`,
    `User story: ${input.story ?? '(none given: test the main flows a customer would use)'}`,
    criteria,
    `Write at most ${input.maxScenarios} scenarios with at most ${input.maxSteps} steps each.`,
    `The site has ${input.pages.length} explored page(s):`,
    ...input.pages.map((page) => wrapPageSnapshot(page, origin)),
  ].join('\n\n');
  return { system: SYSTEM, prompt };
}
