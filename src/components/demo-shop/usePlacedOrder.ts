'use client';

import { useCallback, useSyncExternalStore } from 'react';
import type { ReleaseId } from '@/app/demo-shop/_config/releases';
import { readSession, subscribeSession } from './sessionStore';
import { OrderSchema, orderKey, type PlacedOrder } from './shopState';

/** The last order placed in this tab, or null. Undefined until the page has hydrated. */
export function usePlacedOrder(release: ReleaseId): PlacedOrder | null | undefined {
  const key = orderKey(release);
  const read = useCallback(() => readSession<PlacedOrder | null>(key, OrderSchema, null), [key]);
  return useSyncExternalStore(subscribeSession, read, () => undefined);
}
