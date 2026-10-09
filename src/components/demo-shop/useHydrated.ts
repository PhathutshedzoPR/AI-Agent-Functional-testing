'use client';

import { useSyncExternalStore } from 'react';

const subscribeNever = (): (() => void) => () => undefined;

/**
 * False during server rendering and hydration, true afterwards. Shop buttons stay disabled until
 * then, so a fast click (by a person or a test agent) is never lost before React attaches it.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
}
