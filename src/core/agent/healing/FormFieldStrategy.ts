import type { AriaRole, Locator } from '../../domain';
import type { AriaEntry } from './ariaEntries';
import type { HealingCandidate, IHealingStrategy } from './IHealingStrategy';
import { rankBySimilarName } from './rankBySimilarName';

const FIELD_ROLES: ReadonlySet<AriaRole> = new Set([
  'textbox',
  'searchbox',
  'combobox',
  'listbox',
  'spinbutton',
  'checkbox',
  'radio',
  'switch',
]);

/** A field found by label or placeholder whose label changed: "Cellphone" becomes "Mobile number". */
export class FormFieldStrategy implements IHealingStrategy {
  readonly name = 'form-field-label';
  readonly because = 'a form field with a similar label';

  candidates(broken: Locator, entries: readonly AriaEntry[]): HealingCandidate[] {
    const isField =
      broken.by === 'label' ||
      broken.by === 'placeholder' ||
      (broken.by === 'role' && broken.role !== null && FIELD_ROLES.has(broken.role));
    if (!isField) return [];
    const fields = entries.filter((entry) => FIELD_ROLES.has(entry.role));
    return rankBySimilarName(broken.value, fields, (entry) => ({
      by: 'label',
      value: entry.name,
      role: null,
      exact: true,
      within: broken.within,
    }));
  }
}
