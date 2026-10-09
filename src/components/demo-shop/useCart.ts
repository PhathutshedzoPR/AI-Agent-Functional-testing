'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';
import type { ReleaseId } from '@/app/demo-shop/_config/releases';
import { addItem, setQuantity, type CartLine } from '@/app/demo-shop/_lib/pricing';
import { readSession, removeSession, subscribeSession, writeSession } from './sessionStore';
import { CartSchema, EMPTY_CART, cartKey } from './shopState';

export type Cart = Readonly<{
  lines: readonly CartLine[];
  add: (itemId: string) => void;
  setQuantity: (itemId: string, quantity: number) => void;
  clear: () => void;
}>;

/** The shopper's cart for one release, kept in sessionStorage so it survives page loads. */
export function useCart(release: ReleaseId): Cart {
  const key = cartKey(release);
  const read = useCallback(() => readSession(key, CartSchema, EMPTY_CART), [key]);
  const lines = useSyncExternalStore(subscribeSession, read, () => EMPTY_CART);

  return useMemo(
    () => ({
      lines,
      add: (itemId: string) => writeSession(key, addItem(read(), itemId)),
      setQuantity: (itemId: string, quantity: number) =>
        writeSession(key, setQuantity(read(), itemId, quantity)),
      clear: () => removeSession(key),
    }),
    [key, lines, read],
  );
}
