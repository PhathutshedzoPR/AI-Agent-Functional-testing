import { findMenuItem } from '../_config/menu';
import type { BugFlags } from '../_config/releases';

export type CartLine = Readonly<{ itemId: string; quantity: number }>;

/** Sum of the cart's lines in cents. Unknown items count as zero. */
export function cartTotalCents(lines: readonly CartLine[], bugs: BugFlags): number {
  return lines.reduce((total, line) => {
    const price = findMenuItem(line.itemId)?.priceCents ?? 0;
    const quantity = bugs.cartTotalIgnoresQuantity ? 1 : line.quantity;
    return total + price * quantity;
  }, 0);
}

export function itemCount(lines: readonly CartLine[]): number {
  return lines.reduce((count, line) => count + line.quantity, 0);
}

/** Adds one of `itemId`, or increases its quantity if it is already in the cart. */
export function addItem(lines: readonly CartLine[], itemId: string): CartLine[] {
  const existing = lines.find((line) => line.itemId === itemId);
  if (!existing) return [...lines, { itemId, quantity: 1 }];
  return lines.map((line) =>
    line.itemId === itemId ? { itemId, quantity: line.quantity + 1 } : line,
  );
}

/** Sets a line's quantity; zero or less removes the line. */
export function setQuantity(
  lines: readonly CartLine[],
  itemId: string,
  quantity: number,
): CartLine[] {
  if (quantity <= 0) return lines.filter((line) => line.itemId !== itemId);
  return lines.map((line) => (line.itemId === itemId ? { itemId, quantity } : line));
}
