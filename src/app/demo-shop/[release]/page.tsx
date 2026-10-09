import { MenuBoard } from '@/components/demo-shop/MenuBoard';
import { MENU } from '../_config/menu';
import { resolveRelease } from '../_config/resolveRelease';

export default async function MenuPage({ params }: Readonly<PageProps<'/demo-shop/[release]'>>) {
  const release = await resolveRelease(params);
  return (
    <>
      <h1 className="text-4xl font-extrabold text-kota-crust">Our kotas</h1>
      <p className="mt-2 max-w-prose text-lg">
        Fresh quarter loaves, hot slap chips and proper fillings, delivered in about 35 minutes.
      </p>
      <div className="mt-6">
        <MenuBoard release={release} items={MENU} />
      </div>
    </>
  );
}
