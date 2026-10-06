import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { resolveRelease } from '../../_config/resolveRelease';

export const metadata: Metadata = { title: 'Specials' };

const SPECIALS = [
  { day: 'Kota Tuesday', offer: 'Free atchar on every kota, all day.' },
  { day: 'Student Thursday', offer: 'Show a student card in store for a free cooldrink.' },
] as const;

export default async function SpecialsPage({
  params,
}: Readonly<PageProps<'/demo-shop/[release]/specials'>>) {
  const release = await resolveRelease(params);
  if (release.bugs.specialsPageMissing) notFound();
  return (
    <>
      <h1 className="text-4xl font-extrabold text-kota-crust">Specials</h1>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {SPECIALS.map((special) => (
          <li key={special.day} className="rounded-3xl border-2 border-kota-line bg-white p-5">
            <h2 className="text-xl font-bold text-kota-crust">{special.day}</h2>
            <p className="mt-1">{special.offer}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
