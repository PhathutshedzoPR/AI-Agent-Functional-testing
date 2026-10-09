import { ARIA_ROLES, type AriaRole } from '../../domain';

export type AriaEntry = Readonly<{ role: AriaRole; name: string }>;

const ROLES: ReadonlySet<string> = new Set(ARIA_ROLES);
// "- button "Add to bag"" or "- link "Cart":" in Playwright's YAML snapshot. Names may contain
// escaped quotes; the character class and the escape pair cannot overlap, so matching is linear.
const ENTRY = /^\s*- ([a-z]+) "((?:[^"\\]|\\.)*)"/;

/** Every named element in an aria snapshot, in document order. */
export function ariaEntries(snapshot: string): AriaEntry[] {
  const entries: AriaEntry[] = [];
  for (const line of snapshot.split('\n')) {
    const match = ENTRY.exec(line);
    const role = match?.[1];
    const name = match?.[2]?.replace(/\\(.)/g, '$1').trim();
    if (role && name && ROLES.has(role)) entries.push({ role: role as AriaRole, name });
  }
  return entries;
}
