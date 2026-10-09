import type { z } from 'zod';

type Listener = () => void;

const listeners = new Set<Listener>();
const snapshots = new Map<string, { raw: string | null; value: unknown }>();
// Used when sessionStorage is unavailable (private mode, blocked storage), so the shop still works.
const memory = new Map<string, string>();

function readRaw(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return memory.get(key) ?? null;
  }
}

function parse<T>(raw: string | null, schema: z.ZodType<T>, fallback: T): T {
  if (raw === null) return fallback;
  try {
    const result = schema.safeParse(JSON.parse(raw));
    return result.success ? result.data : fallback;
  } catch {
    // Corrupt JSON in storage: start over rather than break the page.
    return fallback;
  }
}

/**
 * Reads a value from sessionStorage, returning the same object until the stored text changes,
 * as useSyncExternalStore requires.
 */
export function readSession<T>(key: string, schema: z.ZodType<T>, fallback: T): T {
  const raw = readRaw(key);
  const cached = snapshots.get(key);
  if (cached?.raw === raw) return cached.value as T;
  const value = parse(raw, schema, fallback);
  snapshots.set(key, { raw, value });
  return value;
}

export function writeSession(key: string, value: unknown): void {
  const raw = JSON.stringify(value);
  try {
    window.sessionStorage.setItem(key, raw);
  } catch {
    memory.set(key, raw);
  }
  for (const listener of listeners) listener();
}

export function removeSession(key: string): void {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    memory.delete(key);
  }
  for (const listener of listeners) listener();
}

export function subscribeSession(listener: Listener): () => void {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}
