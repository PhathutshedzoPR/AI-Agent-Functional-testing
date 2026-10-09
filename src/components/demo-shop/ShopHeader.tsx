'use client';

import Link from 'next/link';
import { shopPath, type ReleaseConfig } from '@/app/demo-shop/_config/releases';
import { itemCount } from '@/app/demo-shop/_lib/pricing';
import { cn } from '@/lib/cn';
import { shopLink } from './shopStyles';
import { useCart } from './useCart';

type Props = Readonly<{ release: ReleaseConfig }>;

export function ShopHeader({ release }: Props) {
  const { lines } = useCart(release.id);
  const count = itemCount(lines);
  const grid = release.layout === 'grid';

  return (
    <header
      className={cn('border-b-2 border-kota-line bg-kota-bun', grid ? 'py-6 text-center' : 'py-4')}
    >
      <div
        className={cn(
          'mx-auto flex max-w-5xl gap-4 px-4',
          grid ? 'flex-col items-center' : 'items-center justify-between',
        )}
      >
        <Link
          href={shopPath(release.id)}
          className="text-2xl font-extrabold tracking-tight text-kota-crust focus-visible:outline-3 focus-visible:outline-kota-tomato"
        >
          Kota Express
        </Link>
        <nav aria-label="Shop">
          <ul className="flex flex-wrap items-center gap-5">
            <li>
              <Link href={shopPath(release.id)} className={shopLink}>
                Menu
              </Link>
            </li>
            <li>
              <Link href={shopPath(release.id, 'specials')} className={shopLink}>
                Specials
              </Link>
            </li>
            <li className="flex items-center gap-2">
              <Link href={shopPath(release.id, 'cart')} className={shopLink}>
                Cart
              </Link>
              {/* The count is decorative; the link keeps one stable name for people and tests. */}
              <span
                aria-hidden="true"
                className="min-w-6 rounded-full bg-kota-mustard px-2 text-center text-sm font-bold text-kota-ink"
              >
                {count}
              </span>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
