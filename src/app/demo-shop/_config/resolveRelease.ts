import { notFound } from 'next/navigation';
import { findRelease, type ReleaseConfig } from './releases';

/** The release named in the route, or a 404 for anything else. */
export async function resolveRelease(
  params: Promise<Readonly<{ release: string }>>,
): Promise<ReleaseConfig> {
  const release = findRelease((await params).release);
  if (!release) notFound();
  return release;
}
