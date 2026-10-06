import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';

const navLink =
  'rounded-lg px-3 py-2 text-sm font-semibold text-muted hover:bg-raised hover:text-text focus-visible:outline-2 focus-visible:outline-signal';

/** Dark app shell with a sidebar for the dashboard pages. */
export default function DashboardLayout({ children }: Readonly<LayoutProps<'/'>>) {
  return (
    <div className="flex min-h-screen flex-col bg-surface text-text md:flex-row">
      <nav
        aria-label="TestPilot"
        className="flex shrink-0 items-center gap-2 border-b border-divider p-4 md:w-56 md:flex-col md:items-stretch md:border-r md:border-b-0"
      >
        <Link
          href="/"
          aria-label="TestPilot home"
          className="mb-0 px-3 py-2 focus-visible:outline-2 focus-visible:outline-signal md:mb-6"
        >
          <Logo tone="dark" />
        </Link>
        <Link href="/runs/new" className={navLink}>
          New run
        </Link>
        <Link href="/runs" className={navLink}>
          History
        </Link>
      </nav>
      <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
