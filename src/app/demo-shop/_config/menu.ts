export type MenuItem = Readonly<{
  id: string;
  name: string;
  description: string;
  priceCents: number;
}>;

export const MENU: readonly MenuItem[] = [
  {
    id: 'quarter',
    name: 'Quarter Kota',
    description: 'Quarter loaf, slap chips, polony and a slice of cheese.',
    priceCents: 3_500,
  },
  {
    id: 'russian',
    name: 'Russian Kota',
    description: 'Chips, a grilled Russian, cheese and atchar.',
    priceCents: 4_500,
  },
  {
    id: 'veggie',
    name: 'Veggie Kota',
    description: 'Chips, chakalaka, grilled halloumi and lettuce.',
    priceCents: 4_000,
  },
  {
    id: 'full-house',
    name: 'Full House Kota',
    description: 'Chips, Russian, vienna, egg, cheese, polony and atchar.',
    priceCents: 6_500,
  },
];

export const STANDARD_DELIVERY_CENTS = 3_000;
export const EXPRESS_DELIVERY_CENTS = 4_500;

export const SUBURBS = ['Braamfontein', 'Soweto', 'Alexandra', 'Tembisa', 'Sandton'] as const;

export function findMenuItem(id: string): MenuItem | undefined {
  return MENU.find((item) => item.id === id);
}
