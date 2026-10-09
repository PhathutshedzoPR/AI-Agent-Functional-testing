import { z } from 'zod';
import { Locator, type ActionType } from '../domain';
import type { PageSnapshot } from '../ports';
import { LOCATOR_RULES } from './promptRules';
import { ProposedLocatorSchema } from './proposedLocator';
import { UNTRUSTED_CONTENT_RULE, wrapPageSnapshot } from './untrustedContent';

export const HEAL_TEMPERATURE = 0;

export const HealOutputSchema = z.object({
  locator: ProposedLocatorSchema.describe('A locator for the element that now does the same job'),
  confidence: z
    .number()
    .describe('0 to 1: how sure you are this is the same control, renamed or moved'),
  reason: z.string().describe('One sentence on what changed, e.g. "Button renamed from X to Y"'),
});

export type HealOutput = z.infer<typeof HealOutputSchema>;

export type HealPromptInput = Readonly<{
  action: ActionType;
  intent: string;
  broken: Locator;
  problem: string;
  page: PageSnapshot;
  /** Origin of the site under test, stripped from URLs so prompts stay machine-independent. */
  origin: string;
}>;

const SYSTEM = `You repair broken element locators inside TestPilot, a test agent that drives a real browser.
A test step could not find its element. Find the element on the current page that does the same job, for example a button that was renamed.

${UNTRUSTED_CONTENT_RULE}

Locators:
- ${LOCATOR_RULES}

If nothing on the page does the same job, return your best guess with a confidence below 0.3. Never pick an element just because it is the only one left.`;

export function buildHealPrompt(
  input: HealPromptInput,
): Readonly<{ system: string; prompt: string }> {
  const prompt = [
    `Step: ${input.action} - ${input.intent}`,
    `Broken locator: ${JSON.stringify(input.broken)} (${Locator.describe(input.broken)})`,
    `Problem: ${input.problem}`,
    'Current page:',
    wrapPageSnapshot(input.page, input.origin),
  ].join('\n\n');
  return { system: SYSTEM, prompt };
}
