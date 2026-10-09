'use client';

import Link from 'next/link';
import { EXPRESS_DELIVERY_CENTS } from '@/app/demo-shop/_config/menu';
import { shopPath, type ReleaseConfig } from '@/app/demo-shop/_config/releases';
import { OrderTotals } from './OrderTotals';
import { shopLink } from './shopStyles';
import { usePlacedOrder } from './usePlacedOrder';

type Props = Readonly<{ release: ReleaseConfig }>;

export function OrderConfirmation({ release }: Props) {
  const order = usePlacedOrder(release.id);

  if (order === undefined) {
    return <p>Loading your order...</p>;
  }
  if (order === null) {
    return (
      <div className="space-y-3">
        <h1 className="text-3xl font-extrabold text-kota-crust">
          We couldn&apos;t find your order
        </h1>
        <Link href={shopPath(release.id)} className={shopLink}>
          Start from the menu
        </Link>
      </div>
    );
  }

  const deliveryShown = release.bugs.confirmationShowsExpressFee
    ? EXPRESS_DELIVERY_CENTS
    : order.deliveryCents;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold text-kota-crust">Order confirmed</h1>
      <p className="text-lg">
        Thanks, {order.name}. Your order number is <strong>{order.number}</strong>.
      </p>
      <p>We&apos;re delivering to {order.suburb} in about 35 minutes.</p>
      <section
        aria-labelledby="paid-heading"
        className="max-w-sm rounded-3xl border-2 border-kota-line bg-white p-5"
      >
        <h2 id="paid-heading" className="mb-3 text-lg font-bold text-kota-crust">
          What you paid
        </h2>
        <OrderTotals
          subtotalCents={order.subtotalCents}
          deliveryCents={deliveryShown}
          totalCents={order.totalCents}
          totalLabel="Total paid"
        />
      </section>
      <Link href={shopPath(release.id)} className={shopLink}>
        Order something else
      </Link>
    </div>
  );
}
