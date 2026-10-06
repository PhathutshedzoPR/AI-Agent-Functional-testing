import type { Metadata } from 'next';
import { ShopHeader } from '@/components/demo-shop/ShopHeader';
import { RELEASE_IDS } from '../_config/releases';
import { resolveRelease } from '../_config/resolveRelease';

export const metadata: Metadata = {
  title: { default: 'Kota Express', template: '%s | Kota Express' },
  description: 'Kotas delivered across Johannesburg.',
};

// Only the configured releases exist; anything else is a 404.
export const dynamicParams = false;

export function generateStaticParams(): { release: string }[] {
  return RELEASE_IDS.map((release) => ({ release }));
}

export default async function ShopLayout({
  children,
  params,
}: Readonly<LayoutProps<'/demo-shop/[release]'>>) {
  const release = await resolveRelease(params);
  return (
    <div className="min-h-screen bg-kota-cream font-kota text-kota-ink">
      <a
        href="#shop-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:rounded-full focus:bg-white focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <ShopHeader release={release} />
      <main id="shop-main" className="mx-auto max-w-5xl px-4 py-8">
        {children}
      </main>
      <footer className="mx-auto max-w-5xl px-4 pb-10 text-sm">
        Kota Express is a demo shop used to test TestPilot. Nothing here is for sale.
      </footer>
    </div>
  );
}
