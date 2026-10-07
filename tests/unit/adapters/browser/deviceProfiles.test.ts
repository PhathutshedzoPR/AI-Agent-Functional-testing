import { describe, expect, it } from 'vitest';
import { DEVICE_PROFILE_NAMES, deviceContextOptions } from '@/adapters/browser';

describe('deviceContextOptions', () => {
  it('keeps the 1280 x 800 window for desktop runs', () => {
    expect(deviceContextOptions('desktop')).toEqual({ viewport: { width: 1280, height: 800 } });
  });

  it.each([
    ['iphone', 'iPhone 15', 393],
    ['android', 'Pixel 7', 412],
  ] as const)('gives %s the screen, touch and user agent of the %s', (device, name, width) => {
    const options = deviceContextOptions(device);

    expect(DEVICE_PROFILE_NAMES[device]).toBe(name);
    expect(options).toMatchObject({ isMobile: true, hasTouch: true, viewport: { width } });
    expect(options.userAgent).toMatch(/Mobile/);
    // TestPilot runs Chromium for every device, so the profile's browser choice is left out.
    expect(Object.keys(options).sort((a, b) => a.localeCompare(b))).toEqual([
      'deviceScaleFactor',
      'hasTouch',
      'isMobile',
      'userAgent',
      'viewport',
    ]);
  });
});
