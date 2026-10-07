'use client';

import { DEVICE_LABELS, DEVICES, type Device } from '@/core/domain';

type Props = Readonly<{ value: Device; onChange: (value: Device) => void }>;

const pillClass =
  'flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-divider bg-raised px-4 text-sm font-semibold has-checked:border-signal has-focus-visible:outline-2 has-focus-visible:outline-signal';

/** The screen the run uses. Phones are emulated in Chromium, so verdicts stay real browser checks. */
export function DevicePicker({ value, onChange }: Props) {
  return (
    <fieldset>
      <legend className="mb-1 text-lg font-semibold">Which screen?</legend>
      <p className="mb-3 text-sm text-muted">
        Phones run in Chromium with the phone&apos;s screen size, touch and user agent.
      </p>
      <div className="flex flex-wrap gap-3">
        {DEVICES.map((device) => (
          <label key={device} className={pillClass}>
            <input
              type="radio"
              name="device"
              value={device}
              checked={value === device}
              onChange={() => onChange(device)}
              className="accent-signal"
            />
            {DEVICE_LABELS[device]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
