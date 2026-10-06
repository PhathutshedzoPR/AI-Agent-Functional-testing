import type { MenuItem } from '@/app/demo-shop/_config/menu';
import { cn } from '@/lib/cn';
import { formatRand } from '@/lib/formatRand';
import { shopButton } from './shopStyles';

type Props = Readonly<{
  item: MenuItem;
  buttonLabel: string;
  layout: 'list' | 'grid';
  disabled: boolean;
  onAdd: (item: MenuItem) => void;
}>;

export function MenuItemCard({ item, buttonLabel, layout, disabled, onAdd }: Props) {
  const grid = layout === 'grid';
  return (
    <article
      className={cn(
        'rounded-3xl border-2 border-kota-line bg-white p-5',
        grid ? 'flex flex-col gap-3' : 'flex flex-wrap items-center justify-between gap-4',
      )}
    >
      {grid && (
        <p className="self-start rounded-full bg-kota-mustard px-3 py-1 font-bold">
          {formatRand(item.priceCents)}
        </p>
      )}
      <div className="max-w-md">
        <h2 className="text-xl font-bold text-kota-crust">{item.name}</h2>
        <p className="mt-1">{item.description}</p>
        {!grid && <p className="mt-2 font-bold">{formatRand(item.priceCents)}</p>}
      </div>
      <button
        type="button"
        className={cn(shopButton(), grid && 'mt-auto self-start')}
        disabled={disabled}
        onClick={() => onAdd(item)}
      >
        {buttonLabel}
      </button>
    </article>
  );
}
