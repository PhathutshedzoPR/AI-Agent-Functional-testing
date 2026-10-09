import { randomUUID } from 'node:crypto';
import type { IIdGenerator } from '@/core/ports';

/** Cryptographically random UUIDs (never Math.random, Sonar S2245). */
export class CryptoIdGenerator implements IIdGenerator {
  next(): string {
    return randomUUID();
  }
}
