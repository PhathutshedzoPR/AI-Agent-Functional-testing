'use client';

import Link from 'next/link';
import { findMenuItem } from '@/app/demo-shop/_config/menu';
import { shopPath, type ReleaseConfig } from '@/app/demo-shop/_config/releases';
import { cartTotalCents } from '@/app/demo-shop/_lib/pricing';
import { cn } from '@/lib/cn';
import { formatRand } from '@/lib/formatRand';
import { shopButton, shopLink } from './shopStyles';
import { useCart } from './useCart';

type Props = Readonly<{ release: ReleaseConfig }>;

export function CartSummary({ release }: Props) {
  // The server renders the empty cart, so a fresh visitor sees the same page before and after
  // hydration. The checkout link is always there, so crawlers (and TestPilot) can find checkout.
  const cart = useCart(release.id);
  const checkout = (
    <Link href={shopPath(release.id, 'checkout')} className={cn(shopButton(), 'w-full sm:w-auto')}>
      {release.labels.checkout}
    </Link>
  );

  if (cart.lines.length === 0) {
    return (
      <div className="space-y-4">
        <p>Your cart is empty.</p>
        <Link href={shopPath(release.id)} className={shopLink}>
          Back to the menu
        </Link>
        <div>{checkout}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ul className="divide-y-2 divide-kota-line rounded-3xl border-2 border-kota-line bg-white">
        {cart.lines.map((line) => {
          const item = findMenuItem(line.itemId);
          if (!item) return null;
          return (
            <li key={line.itemId} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-bold text-kota-crust">{item.name}</p>
                <p>
                  {line.quantity} × {formatRand(item.priceCents)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label={`Remove one ${item.name}`}
                  className={shopButton({ tone: 'icon' })}
                  onClick={() => cart.setQuantity(line.itemId, line.quantity - 1)}
                >
                  −
                </button>
                <button
                  type="button"
                  aria-label={`Add one more ${item.name}`}
                  className={shopButton({ tone: 'icon' })}
                  onClick={() => cart.setQuantity(line.itemId, line.quantity + 1)}
                >
                  +
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <dl className="flex items-baseline justify-between text-xl">
        <dt className="font-semibold">Total</dt>
        <dd className="font-extrabold">{formatRand(cartTotalCents(cart.lines, release.bugs))}</dd>
      </dl>
      {checkout}
    </div>
  );
}
