import { lookup } from 'node:dns/promises';
import type { HostResolver } from './TargetUrlGuard';

/** Resolves a hostname to all its IPv4 and IPv6 addresses through the system resolver. */
export const resolveHostWithDns: HostResolver = async (hostname) => {
  const records = await lookup(hostname, { all: true, verbatim: true });
  return records.map((record) => record.address);
};
