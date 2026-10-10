import { NextResponse, type NextRequest } from 'next/server';
import { findRelease } from './app/demo-shop/_config/releases';

// Kota Express's seeded performance bug (the `slowCheckout` flag): the checkout waits on a slow
// stock check before the server answers, well over TestPilot's 800 ms time-to-first-byte budget.
const STOCK_CHECK_MS = 1_500;

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const release = findRelease(request.nextUrl.pathname.split('/')[2] ?? '');
  if (release?.bugs.slowCheckout) {
    await new Promise((resolve) => setTimeout(resolve, STOCK_CHECK_MS));
  }
  return NextResponse.next();
}

export const config = { matcher: '/demo-shop/:release/checkout' };
