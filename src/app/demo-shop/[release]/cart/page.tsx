import type { Metadata } from 'next';
import { CartSummary } from '@/components/demo-shop/CartSummary';
import { resolveRelease } from '../../_config/resolveRelease';

export const metadata: Metadata = { title: 'Your order' };

export default async function CartPage({
  params,
}: Readonly<PageProps<'/demo-shop/[release]/cart'>>) {
  const release = await resolveRelease(params);
  return (
    <>
      <h1 className="mb-6 text-4xl font-extrabold text-kota-crust">Your order</h1>
      <CartSummary release={release} />
    </>
  );
}
