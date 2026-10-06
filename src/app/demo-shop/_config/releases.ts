/**
 * Kota Express releases. Every release uses the same pages and components; they differ only by
 * the labels, layout and seeded-bug flags below (CLAUDE.md section 8).
 */

export const RELEASE_IDS = ['stable', 'redesign', 'buggy'] as const;
export type ReleaseId = (typeof RELEASE_IDS)[number];

export type BugFlags = Readonly<{
  /** Cart total adds each line's unit price once, whatever the quantity. */
  cartTotalIgnoresQuantity: boolean;
  /** Cellphone validation checks length only, so letters get through. */
  cellphoneAcceptsLetters: boolean;
  /** Confirmation shows the express delivery fee instead of the fee that was charged. */
  confirmationShowsExpressFee: boolean;
  /** The Specials page is missing, so its navigation link returns 404. */
  specialsPageMissing: boolean;
}>;

export type ReleaseLabels = Readonly<{
  addToOrder: string;
  checkout: string;
  placeOrder: string;
}>;

export type ReleaseConfig = Readonly<{
  id: ReleaseId;
  name: string;
  summary: string;
  layout: 'list' | 'grid';
  labels: ReleaseLabels;
  bugs: BugFlags;
}>;

const NO_BUGS: BugFlags = {
  cartTotalIgnoresQuantity: false,
  cellphoneAcceptsLetters: false,
  confirmationShowsExpressFee: false,
  specialsPageMissing: false,
};

const CLASSIC_LABELS: ReleaseLabels = {
  addToOrder: 'Add to order',
  checkout: 'Checkout',
  placeOrder: 'Place order',
};

export const RELEASES: Readonly<Record<ReleaseId, ReleaseConfig>> = {
  stable: {
    id: 'stable',
    name: 'Stable',
    summary: 'Everything works.',
    layout: 'list',
    labels: CLASSIC_LABELS,
    bugs: NO_BUGS,
  },
  redesign: {
    id: 'redesign',
    name: 'Redesign',
    summary: 'Same behaviour, renamed buttons and a new layout.',
    layout: 'grid',
    labels: {
      addToOrder: 'Add to bag',
      checkout: 'Proceed to payment',
      placeOrder: 'Confirm order',
    },
    bugs: NO_BUGS,
  },
  buggy: {
    id: 'buggy',
    name: 'Buggy',
    summary: 'Four seeded bugs.',
    layout: 'list',
    labels: CLASSIC_LABELS,
    bugs: {
      cartTotalIgnoresQuantity: true,
      cellphoneAcceptsLetters: true,
      confirmationShowsExpressFee: true,
      specialsPageMissing: true,
    },
  },
};

export function isReleaseId(value: string): value is ReleaseId {
  return (RELEASE_IDS as readonly string[]).includes(value);
}

/** The release for a route segment, or null when there is no such release. */
export function findRelease(value: string): ReleaseConfig | null {
  return isReleaseId(value) ? RELEASES[value] : null;
}

export function shopPath(release: ReleaseId, page = ''): string {
  return page ? `/demo-shop/${release}/${page}` : `/demo-shop/${release}`;
}
