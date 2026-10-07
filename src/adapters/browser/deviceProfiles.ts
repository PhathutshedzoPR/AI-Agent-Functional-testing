import { devices, type BrowserContextOptions } from 'playwright';
import type { Device } from '@/core/domain';

/** The Playwright device profile behind each phone. Exported specs name the same profile. */
export const DEVICE_PROFILE_NAMES: Readonly<Record<Exclude<Device, 'desktop'>, string>> = {
  iphone: 'iPhone 15',
  android: 'Pixel 7',
};

const DESKTOP_VIEWPORT = { width: 1280, height: 800 };

/**
 * Screen, touch and user agent for a device. Only those fields are taken from the profile:
 * TestPilot runs Chromium for every device, whatever browser the profile would pick.
 */
export function deviceContextOptions(device: Device): BrowserContextOptions {
  if (device === 'desktop') return { viewport: DESKTOP_VIEWPORT };
  const name = DEVICE_PROFILE_NAMES[device];
  const profile = devices[name];
  if (!profile) throw new Error(`Playwright has no device profile named "${name}".`);
  const { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch } = profile;
  return { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch };
}
