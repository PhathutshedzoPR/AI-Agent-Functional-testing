import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Pill buttons and button-like links in TestPilot's tokens (CLAUDE.md section 9). Every one is at
 * least 44px tall for touch. The focus ring follows the surface: forest on light, signal on dark.
 */
export const buttonStyles = cva(
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
  {
    variants: {
      // signal is the one call to action on a screen; outline is for everything else.
      tone: {
        signal: 'bg-signal text-ink shadow-sm hover:brightness-95',
        forest: 'bg-forest text-paper hover:brightness-110',
        outline: '',
      },
      surface: {
        light: 'focus-visible:outline-forest',
        dark: 'focus-visible:outline-signal',
      },
      size: {
        md: 'px-6 py-3',
        sm: 'px-4 text-sm',
      },
    },
    compoundVariants: [
      {
        tone: 'outline',
        surface: 'light',
        className: 'border-2 border-forest text-forest hover:bg-forest hover:text-paper',
      },
      { tone: 'outline', surface: 'dark', className: 'border border-control hover:border-signal' },
    ],
    defaultVariants: { tone: 'signal', surface: 'dark', size: 'md' },
  },
);

export type ButtonStyleProps = VariantProps<typeof buttonStyles>;
