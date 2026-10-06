import type { Metadata } from 'next';
import { OrderConfirmation } from '@/components/demo-shop/OrderConfirmation';
import { resolveRelease } from '../../_config/resolveRelease';

export const metadata: Metadata = { title: 'Order confirmed' };

export default async function ConfirmationPage({
  params,
}: Readonly<PageProps<'/demo-shop/[release]/confirmation'>>) {
  const release = await resolveRelease(params);
  return <OrderConfirmation release={release} />;
}
