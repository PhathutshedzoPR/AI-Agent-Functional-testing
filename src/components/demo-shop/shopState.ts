import { z } from 'zod';
import type { ReleaseId } from '@/app/demo-shop/_config/releases';
import type { CartLine } from '@/app/demo-shop/_lib/pricing';

export const CartSchema = z.array(
  z.object({ itemId: z.string(), quantity: z.number().int().positive() }),
);

export const OrderSchema = z.object({
  number: z.string(),
  name: z.string(),
  suburb: z.string(),
  lines: CartSchema,
  subtotalCents: z.number().int(),
  deliveryCents: z.number().int(),
  totalCents: z.number().int(),
});

export type PlacedOrder = z.infer<typeof OrderSchema>;

export const EMPTY_CART: readonly CartLine[] = [];

export const cartKey = (release: ReleaseId): string => `kota-express:${release}:cart`;
export const orderKey = (release: ReleaseId): string => `kota-express:${release}:order`;
