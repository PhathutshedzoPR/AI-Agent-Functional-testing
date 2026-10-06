'use client';

import { useState } from 'react';
import type { MenuItem } from '@/app/demo-shop/_config/menu';
import type { ReleaseConfig } from '@/app/demo-shop/_config/releases';
import { itemCount } from '@/app/demo-shop/_lib/pricing';
import { cn } from '@/lib/cn';
import { MenuItemCard } from './MenuItemCard';
import { useCart } from './useCart';
import { useHydrated } from './useHydrated';

type Props = Readonly<{ release: ReleaseConfig; items: readonly MenuItem[] }>;

export function MenuBoard({ release, items }: Props) {
  const cart = useCart(release.id);
  const hydrated = useHydrated();
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  const count = itemCount(cart.lines);

  const add = (item: MenuItem): void => {
    cart.add(item.id);
    setLastAdded(item.name);
  };

  return (
    <>
      <p role="status" className="min-h-6 font-semibold text-kota-crust">
        {lastAdded && `Added ${lastAdded} to your order. Items in your order: ${count}.`}
      </p>
      <div className={cn('mt-4 grid gap-4', release.layout === 'grid' && 'sm:grid-cols-2')}>
        {items.map((item) => (
          <MenuItemCard
            key={item.id}
            item={item}
            buttonLabel={release.labels.addToOrder}
            layout={release.layout}
            disabled={!hydrated}
            onAdd={add}
          />
        ))}
      </div>
    </>
  );
}
