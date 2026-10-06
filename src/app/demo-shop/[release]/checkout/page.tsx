import type { Metadata } from 'next';
import { CheckoutForm } from '@/components/demo-shop/CheckoutForm';
import { resolveRelease } from '../../_config/resolveRelease';

export const metadata: Metadata = { title: 'Checkout' };

export default async function CheckoutPage({
  params,
}: Readonly<PageProps<'/demo-shop/[release]/checkout'>>) {
  const release = await resolveRelease(params);
  return (
    <>
      <h1 className="mb-6 text-4xl font-extrabold text-kota-crust">Checkout</h1>
      <CheckoutForm release={release} />
    </>
  );
}
