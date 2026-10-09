import { describe, expect, it } from 'vitest';
import { resolveHostWithDns } from '@/adapters/security';

describe('resolveHostWithDns', () => {
  it('returns every address of a host from the system resolver', async () => {
    const addresses = await resolveHostWithDns('localhost');

    expect(addresses.length).toBeGreaterThan(0);
    expect(addresses.every((address) => address === '::1' || address.startsWith('127.'))).toBe(
      true,
    );
  });
});
