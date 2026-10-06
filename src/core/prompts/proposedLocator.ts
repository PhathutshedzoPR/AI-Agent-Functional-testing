import { z } from 'zod';
import { LocatorStrategySchema } from '../domain';

const ROLE_HINT =
  'ARIA role when "by" is "role", e.g. button, link, textbox, combobox, checkbox, heading, article; otherwise null';

/**
 * The locator shape the model fills in. Roles are plain strings here because an 80-value enum
 * nested in every step makes constrained decoding very slow on some providers. Nothing is trusted
 * from this shape: StepFactory and Locator.create check every value, roles included, against the
 * ARIA role list before a step can run (CLAUDE.md section 4, item 4).
 */
export const ProposedLocatorSchema = z.object({
  by: LocatorStrategySchema.describe(
    'Prefer "role" with an accessible name, then "label", "placeholder", "text", "testId"',
  ),
  value: z
    .string()
    .describe('Accessible name, label, placeholder, visible text or test id, copied exactly'),
  role: z.string().nullable().describe(ROLE_HINT),
  exact: z.boolean().describe('true to match the whole name, false to match a substring'),
  within: z
    .object({
      role: z.string().describe('Role of the container, e.g. "article" for one menu item'),
      hasText: z.string().describe('Text that makes the container unique, e.g. the item name'),
    })
    .nullable()
    .describe('Container scope when the same control repeats on the page, otherwise null'),
});

export type ProposedLocator = z.infer<typeof ProposedLocatorSchema>;
