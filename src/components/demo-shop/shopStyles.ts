import { cva } from 'class-variance-authority';

/** Shared Kota Express control styles, so pages don't repeat class strings. */
export const shopButton = cva(
  'inline-flex items-center justify-center rounded-full font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-kota-tomato disabled:cursor-not-allowed disabled:opacity-60',
  {
    variants: {
      tone: {
        primary: 'bg-kota-tomato px-5 py-2.5 text-white hover:bg-kota-crust',
        secondary: 'border-2 border-kota-crust px-4 py-2 text-kota-crust hover:bg-kota-bun',
        icon: 'size-9 border-2 border-kota-crust text-lg text-kota-crust hover:bg-kota-bun',
      },
    },
    defaultVariants: { tone: 'primary' },
  },
);

export const shopLink =
  'font-semibold text-kota-tomato underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-kota-tomato';

export const shopField =
  'w-full rounded-xl border-2 border-kota-crust/60 bg-white px-3 py-2 text-kota-ink focus-visible:border-kota-tomato focus-visible:outline-3 focus-visible:outline-kota-mustard aria-invalid:border-kota-tomato';
