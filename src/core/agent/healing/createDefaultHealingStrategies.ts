import { FormFieldStrategy } from './FormFieldStrategy';
import type { IHealingStrategy } from './IHealingStrategy';
import { SameRoleSimilarNameStrategy } from './SameRoleSimilarNameStrategy';
import { VisibleTextStrategy } from './VisibleTextStrategy';

/** Rule strategies in the order CLAUDE.md section 6 sets: role and name, label, then text. */
export function createDefaultHealingStrategies(): readonly IHealingStrategy[] {
  return [new SameRoleSimilarNameStrategy(), new FormFieldStrategy(), new VisibleTextStrategy()];
}
