import type { Metadata } from 'next';
import Link from 'next/link';
import { RELEASE_IDS, RELEASES, shopPath } from './_config/releases';

export const metadata: Metadata = { title: 'Kota Express releases' };

/** Index of the demo shop's releases, for people setting up a run by hand. */
export default function DemoShopIndex() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl bg-kota-cream px-4 py-10 font-kota text-kota-ink">
      <h1 className="text-4xl font-extrabold text-kota-crust">Kota Express releases</h1>
      <ul className="mt-6 space-y-3">
        {RELEASE_IDS.map((id) => (
          <li key={id}>
            <Link href={shopPath(id)} className="font-bold text-kota-tomato underline">
              {RELEASES[id].name}
            </Link>
            : {RELEASES[id].summary}
          </li>
        ))}
      </ul>
    </main>
  );
}
