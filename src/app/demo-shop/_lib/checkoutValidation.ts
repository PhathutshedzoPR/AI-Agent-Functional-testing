import { SUBURBS } from '../_config/menu';
import type { BugFlags } from '../_config/releases';

export type CheckoutFields = Readonly<{
  name: string;
  cellphone: string;
  email: string;
  address: string;
  suburb: string;
}>;

export type CheckoutErrors = Partial<Record<keyof CheckoutFields, string>>;

// South African mobile numbers: 0 or +27, then a 6, 7 or 8 and eight more digits.
const SA_CELLPHONE = /^(?:\+27|0)[678]\d{8}$/;
const EMAIL = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;
const MIN_CELLPHONE_LENGTH = 10;

export function isValidCellphone(raw: string, bugs: BugFlags): boolean {
  const compact = raw.replace(/[\s-]/g, '');
  if (bugs.cellphoneAcceptsLetters) return compact.length >= MIN_CELLPHONE_LENGTH;
  return SA_CELLPHONE.test(compact);
}

/** Field errors for the checkout form, keyed by field. Empty when the form is valid. */
export function validateCheckout(fields: CheckoutFields, bugs: BugFlags): CheckoutErrors {
  const errors: CheckoutErrors = {};
  if (fields.name.trim().length < 2) errors.name = 'Enter your full name.';
  if (!isValidCellphone(fields.cellphone, bugs)) {
    errors.cellphone = 'Enter a South African cellphone number, like 082 123 4567.';
  }
  if (!EMAIL.test(fields.email.trim())) errors.email = 'Enter a valid email address.';
  if (fields.address.trim().length < 5) errors.address = 'Enter your street address.';
  if (!(SUBURBS as readonly string[]).includes(fields.suburb)) {
    errors.suburb = 'Choose a suburb we deliver to.';
  }
  return errors;
}
