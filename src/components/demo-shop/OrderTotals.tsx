import { formatRand } from '@/lib/formatRand';

type Props = Readonly<{
  subtotalCents: number;
  deliveryCents: number;
  totalCents: number;
  totalLabel: string;
}>;

/** Items, delivery fee and total, shown at checkout and on the confirmation. */
export function OrderTotals({ subtotalCents, deliveryCents, totalCents, totalLabel }: Props) {
  return (
    <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-1">
      <dt>Items</dt>
      <dd className="text-right">{formatRand(subtotalCents)}</dd>
      <dt>Delivery fee</dt>
      <dd className="text-right">{formatRand(deliveryCents)}</dd>
      <dt className="font-bold">{totalLabel}</dt>
      <dd className="text-right font-extrabold">{formatRand(totalCents)}</dd>
    </dl>
  );
}
