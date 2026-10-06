/** The four suggestion cards on the new-run screen. Replays are recorded for these stories. */
export const STORY_SUGGESTIONS = [
  {
    title: 'Order two kotas and check out',
    story:
      'As a hungry customer I want to order two Quarter Kotas and check out.\n- The cart total is twice the price of one Quarter Kota\n- Checking out with valid details shows the order confirmation',
  },
  {
    title: 'Checkout rejects a bad cellphone number',
    story:
      'As the shop owner I only want orders I can phone back.\n- Checkout refuses a cellphone number that contains letters\n- The order is not placed until the number is fixed',
  },
  {
    title: 'The confirmation shows the delivery fee',
    story:
      'As a customer I want to see what I paid for delivery.\n- The confirmation page shows the same delivery fee as checkout',
  },
  {
    title: 'Every navigation link works',
    story:
      'As a visitor I want every link in the shop menu to open a working page.\n- Menu, Specials and Cart each open without an error',
  },
] as const;
