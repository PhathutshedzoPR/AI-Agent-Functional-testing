'use client';

import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type RunTab = Readonly<{
  id: string;
  label: string;
  content: ReactNode;
  /** Left out of the printed report (the export links, say). */
  screenOnly?: boolean;
}>;

type Props = Readonly<{ tabs: readonly RunTab[]; active: string; onChange: (id: string) => void }>;

/** Accessible tabs (arrow keys move between them) for the run's details. */
export function RunTabs({ tabs, active, onChange }: Props) {
  const base = useId();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const current = tabs.find((tab) => tab.id === active) ?? tabs[0];

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number): void => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const next = (index + step + tabs.length) % tabs.length;
    const tab = tabs[next];
    if (!tab) return;
    onChange(tab.id);
    refs.current[next]?.focus();
  };

  return (
    <div>
      <div
        role="tablist"
        aria-label="Run details"
        className="flex flex-wrap gap-2 border-b border-divider pb-3 print:hidden"
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={(element) => {
              refs.current[index] = element;
            }}
            type="button"
            role="tab"
            id={`${base}-${tab.id}-tab`}
            aria-selected={tab.id === current?.id}
            aria-controls={`${base}-${tab.id}-panel`}
            tabIndex={tab.id === current?.id ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-signal',
              tab.id === current?.id ? 'bg-text text-surface' : 'text-muted hover:text-text',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {/* Every panel is rendered so "Save as PDF" prints them all; only the open one shows on screen. */}
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${base}-${tab.id}-panel`}
          aria-labelledby={`${base}-${tab.id}-tab`}
          // A class, not the hidden attribute: Tailwind forces [hidden] off even in print.
          className={cn(
            'pt-5',
            tab.id !== current?.id && 'hidden',
            tab.screenOnly ? 'print:hidden' : 'print:block',
          )}
        >
          <h2 className="hidden text-lg font-semibold print:block">{tab.label}</h2>
          {tab.content}
        </div>
      ))}
    </div>
  );
}
