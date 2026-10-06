'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type SubmitEvent } from 'react';
import { STANDARD_DELIVERY_CENTS, SUBURBS } from '@/app/demo-shop/_config/menu';
import { shopPath, type ReleaseConfig } from '@/app/demo-shop/_config/releases';
import {
  validateCheckout,
  type CheckoutErrors,
  type CheckoutFields,
} from '@/app/demo-shop/_lib/checkoutValidation';
import { cartTotalCents } from '@/app/demo-shop/_lib/pricing';
import { CheckoutField } from './CheckoutField';
import { OrderTotals } from './OrderTotals';
import { writeSession } from './sessionStore';
import { orderKey, type PlacedOrder } from './shopState';
import { shopButton, shopField, shopLink } from './shopStyles';
import { useCart } from './useCart';
import { useHydrated } from './useHydrated';

type Props = Readonly<{ release: ReleaseConfig }>;

const EMPTY_CART_MESSAGE = 'Add at least one kota before you place your order.';

function readFields(form: HTMLFormElement): CheckoutFields {
  const data = new FormData(form);
  const text = (name: keyof CheckoutFields): string => {
    const value = data.get(name);
    return typeof value === 'string' ? value : '';
  };
  return {
    name: text('name'),
    cellphone: text('cellphone'),
    email: text('email'),
    address: text('address'),
    suburb: text('suburb'),
  };
}

export function CheckoutForm({ release }: Props) {
  const cart = useCart(release.id);
  const hydrated = useHydrated();
  const router = useRouter();
  const [errors, setErrors] = useState<CheckoutErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const subtotalCents = cartTotalCents(cart.lines, release.bugs);
  const isEmpty = hydrated && cart.lines.length === 0;

  const submit = (event: SubmitEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const fields = readFields(event.currentTarget);
    const fieldErrors = validateCheckout(fields, release.bugs);
    setErrors(fieldErrors);
    if (cart.lines.length === 0) {
      setFormError(EMPTY_CART_MESSAGE);
      return;
    }
    const problems = Object.keys(fieldErrors).length;
    if (problems > 0) {
      const noun = problems === 1 ? 'problem' : 'problems';
      setFormError(`Please fix ${problems} ${noun} below.`);
      return;
    }
    const order: PlacedOrder = {
      number: `KX-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      name: fields.name.trim(),
      suburb: fields.suburb,
      lines: [...cart.lines],
      subtotalCents,
      deliveryCents: STANDARD_DELIVERY_CENTS,
      totalCents: subtotalCents + STANDARD_DELIVERY_CENTS,
    };
    writeSession(orderKey(release.id), order);
    cart.clear();
    router.push(shopPath(release.id, 'confirmation'));
  };

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_18rem]">
      <form noValidate onSubmit={submit} className="space-y-4" aria-describedby="checkout-help">
        <p id="checkout-help">We deliver across Johannesburg. All fields are required.</p>
        {isEmpty && (
          <p className="rounded-2xl bg-kota-bun p-4">
            Your cart is empty. Add a kota from the{' '}
            <Link href={shopPath(release.id)} className={shopLink}>
              menu
            </Link>{' '}
            before you check out.
          </p>
        )}
        {formError && (
          <p
            role="alert"
            className="rounded-2xl border-2 border-kota-tomato bg-white p-4 font-semibold"
          >
            {formError}
          </p>
        )}
        <CheckoutField id="name" label="Full name" error={errors.name}>
          {(describedBy) => (
            <input
              id="name"
              name="name"
              autoComplete="name"
              className={shopField}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={describedBy}
            />
          )}
        </CheckoutField>
        <CheckoutField id="cellphone" label="Cellphone number" error={errors.cellphone}>
          {(describedBy) => (
            <input
              id="cellphone"
              name="cellphone"
              type="tel"
              autoComplete="tel"
              placeholder="082 123 4567"
              className={shopField}
              aria-invalid={Boolean(errors.cellphone)}
              aria-describedby={describedBy}
            />
          )}
        </CheckoutField>
        <CheckoutField id="email" label="Email address" error={errors.email}>
          {(describedBy) => (
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              className={shopField}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={describedBy}
            />
          )}
        </CheckoutField>
        <CheckoutField id="address" label="Street address" error={errors.address}>
          {(describedBy) => (
            <input
              id="address"
              name="address"
              autoComplete="street-address"
              className={shopField}
              aria-invalid={Boolean(errors.address)}
              aria-describedby={describedBy}
            />
          )}
        </CheckoutField>
        <CheckoutField id="suburb" label="Suburb" error={errors.suburb}>
          {(describedBy) => (
            <select
              id="suburb"
              name="suburb"
              defaultValue=""
              className={shopField}
              aria-invalid={Boolean(errors.suburb)}
              aria-describedby={describedBy}
            >
              <option value="" disabled>
                Choose a suburb
              </option>
              {SUBURBS.map((suburb) => (
                <option key={suburb} value={suburb}>
                  {suburb}
                </option>
              ))}
            </select>
          )}
        </CheckoutField>
        <button type="submit" className={shopButton()} disabled={!hydrated}>
          {release.labels.placeOrder}
        </button>
      </form>
      <aside
        aria-labelledby="summary-heading"
        className="h-fit rounded-3xl border-2 border-kota-line bg-white p-5"
      >
        <h2 id="summary-heading" className="mb-3 text-lg font-bold text-kota-crust">
          Order summary
        </h2>
        <OrderTotals
          subtotalCents={subtotalCents}
          deliveryCents={STANDARD_DELIVERY_CENTS}
          totalCents={subtotalCents + STANDARD_DELIVERY_CENTS}
          totalLabel="Total"
        />
      </aside>
    </div>
  );
}
