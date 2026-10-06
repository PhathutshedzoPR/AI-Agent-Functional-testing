import { describe, expect, it } from 'vitest';
import { TargetUrlGuard, type HostResolver } from '@/adapters/security';
import { TargetBlockedError } from '@/core/errors';

const APP = new URL('http://localhost:3000');

// Documentation-range and well-known public resolver addresses; nothing here is contacted.
const DNS: Record<string, readonly string[]> = {
  'shop.example': ['93.184.216.34'],
  'dual.example': ['93.184.216.34', '2606:2800:220:1:248:1893:25c8:1946'],
  'sneaky.example': ['93.184.216.34', '10.0.0.5'],
  'metadata.example': ['169.254.169.254'],
  'mapped.example': ['::ffff:127.0.0.1'],
  'nothing.example': [],
  'garbage.example': ['not-an-ip'],
};

const resolver: HostResolver = (hostname) => {
  const addresses = DNS[hostname];
  return addresses ? Promise.resolve(addresses) : Promise.reject(new Error('ENOTFOUND'));
};

function guard(mode: 'allowlist' | 'public', allowlist: string[] = []): TargetUrlGuard {
  return new TargetUrlGuard({ mode, allowlist, appBaseUrl: APP, maxUrlChars: 2_048 }, resolver);
}

async function reasonFor(target: TargetUrlGuard, url: string): Promise<string> {
  try {
    await target.assertAllowed(url);
    return 'allowed';
  } catch (error) {
    expect(error).toBeInstanceOf(TargetBlockedError);
    return (error as TargetBlockedError).reason;
  }
}

describe('TargetUrlGuard, rules for every mode', () => {
  const both = [guard('allowlist', ['localhost:3000']), guard('public')];

  it.each([
    ['file:///etc/passwd', 'only http and https are supported'],
    ['javascript:alert(1)', 'only http and https are supported'],
    ['data:text/html,<h1>x</h1>', 'only http and https are supported'],
    ['ftp://shop.example/', 'only http and https are supported'],
    ['https://user:secret@shop.example/', 'URLs with credentials are not accepted'],
    ['not a url', 'it is not a valid URL'],
    [`https://shop.example/${'a'.repeat(2_100)}`, 'the URL is too long'],
    ['http://localhost:3000/api/runs', "TestPilot's own API is off limits"],
    ['http://localhost:3000/api', "TestPilot's own API is off limits"],
  ])('rejects %s', async (url, reason) => {
    for (const target of both) {
      expect(await reasonFor(target, url)).toBe(reason);
    }
  });
});

describe('TargetUrlGuard in allowlist mode', () => {
  const target = guard('allowlist', ['localhost:3000', 'kota.test']);

  it('accepts listed hosts, with or without a port entry', async () => {
    expect(await reasonFor(target, 'http://localhost:3000/demo-shop/stable')).toBe('allowed');
    expect(await reasonFor(target, 'https://KOTA.test/menu')).toBe('allowed');
    expect(await reasonFor(target, 'https://kota.test:8443/menu')).toBe('allowed');
  });

  it('rejects other hosts and other ports of a host:port entry', async () => {
    expect(await reasonFor(target, 'https://shop.example/')).toBe(
      'shop.example is not on the allowlist',
    );
    expect(await reasonFor(target, 'http://localhost:5432/')).toBe(
      'localhost:5432 is not on the allowlist',
    );
  });

  it('returns the parsed URL', async () => {
    const url = await target.assertAllowed('http://localhost:3000/demo-shop/stable?x=1');

    expect(url.pathname).toBe('/demo-shop/stable');
  });
});

describe('TargetUrlGuard in public mode', () => {
  const target = guard('public');

  it('accepts hosts that resolve only to public unicast addresses', async () => {
    expect(await reasonFor(target, 'https://shop.example/')).toBe('allowed');
    expect(await reasonFor(target, 'https://dual.example/')).toBe('allowed');
  });

  it.each([
    ['http://127.0.0.1/', 'it points to a loopback address'],
    ['http://2130706433/', 'it points to a loopback address'],
    ['http://0x7f.1/', 'it points to a loopback address'],
    ['http://[::1]/', 'it points to a loopback address'],
    ['https://[::ffff:127.0.0.1]/', 'it points to a loopback address'],
    ['https://10.0.0.8/', 'it points to a private address'],
    ['https://192.168.1.1/', 'it points to a private address'],
    ['https://169.254.169.254/latest/meta-data', 'it points to a linkLocal address'],
    ['https://[fe80::1]/', 'it points to a linkLocal address'],
    ['https://[fd00::1]/', 'it points to a uniqueLocal address'],
    ['https://0.0.0.0/', 'it points to a unspecified address'],
    ['http://metadata.example/', 'it points to a linkLocal address'],
    ['http://mapped.example/', 'it points to a loopback address'],
    ['http://sneaky.example/', 'it points to a private address'],
    ['http://nothing.example/', 'the host did not resolve'],
    ['http://unknown.example/', 'the host did not resolve'],
    ['http://garbage.example/', 'the host resolved to an invalid address'],
  ])('rejects %s', async (url, reason) => {
    expect(await reasonFor(target, url)).toBe(reason);
  });
});

describe('TargetUrlGuard.isAllowed', () => {
  it('answers without throwing, for start URLs and redirect targets alike', async () => {
    const target = guard('allowlist', ['localhost:3000']);

    await expect(target.isAllowed('http://localhost:3000/demo-shop/stable')).resolves.toBe(true);
    // A redirect from the shop to a cloud metadata endpoint is checked as its own request.
    await expect(target.isAllowed('http://169.254.169.254/latest/meta-data')).resolves.toBe(false);
  });

  it('lets unexpected resolver bugs surface', async () => {
    const broken = new TargetUrlGuard(
      { mode: 'public', allowlist: [], appBaseUrl: APP, maxUrlChars: 2_048 },
      () => Promise.resolve([]),
    );
    const throwing = new TargetUrlGuard(
      { mode: 'public', allowlist: [], appBaseUrl: APP, maxUrlChars: 2_048 },
      () => Promise.resolve(null as unknown as string[]),
    );

    await expect(broken.isAllowed('https://shop.example/')).resolves.toBe(false);
    await expect(throwing.isAllowed('https://shop.example/')).rejects.toBeInstanceOf(TypeError);
  });
});
