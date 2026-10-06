import type { ReactNode } from 'react';

type Props = Readonly<{
  id: string;
  label: string;
  error: string | undefined;
  children: (describedBy: string | undefined) => ReactNode;
}>;

/** A labelled checkout control with its inline error, wired up for screen readers. */
export function CheckoutField({ id, label, error, children }: Props) {
  const errorId = `${id}-error`;
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block font-semibold">
        {label}
      </label>
      {children(error ? errorId : undefined)}
      {error && (
        <p id={errorId} className="text-sm font-semibold text-kota-tomato">
          {error}
        </p>
      )}
    </div>
  );
}
