'use client';

import { useSyncExternalStore } from 'react';

type Props = Readonly<{ appBaseUrl: string; path: string }>;

const subscribeNever = (): (() => void) => () => undefined;

/**
 * Runs start only from the server's own address (CSRF-lite, CLAUDE.md section 4, item 6). Opened
 * anywhere else, such as localhost while a public tunnel is live, the page says where to go
 * before a run is refused.
 */
export function OtherAddressNotice({ appBaseUrl, path }: Props) {
  const home = new URL(appBaseUrl);
  const elsewhere = useSyncExternalStore(
    subscribeNever,
    () => window.location.origin !== home.origin,
    () => false,
  );
  if (!elsewhere) return null;
  return (
    <p className="rounded-xl border border-healed bg-raised p-4 text-sm">
      This server takes runs from{' '}
      <a
        href={new URL(path, home).href}
        className="font-semibold text-signal underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-signal"
      >
        {home.host}
      </a>
      , not from this address. Open TestPilot there to start a run.
    </p>
  );
}
