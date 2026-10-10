import { AUDIT_CATEGORIES, AUDIT_CATEGORY_LABELS, PageAudit, plural } from '@/core/domain';
import { StatusBadge } from './StatusBadge';

type Props = Readonly<{ pages: readonly Readonly<{ url: string; audit: PageAudit | null }>[] }>;

const pathOf = (url: string): string => {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
};

function PageTable({ audit }: Readonly<{ audit: PageAudit }>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">
          Performance and security checks for {pathOf(audit.url)}
        </caption>
        <thead className="text-muted">
          <tr className="border-b border-divider">
            <th scope="col" className="py-2 pr-4 font-semibold">
              Check
            </th>
            <th scope="col" className="py-2 pr-4 font-semibold max-sm:hidden">
              Result
            </th>
            <th scope="col" className="py-2 pr-4 font-semibold">
              Measured
            </th>
            <th scope="col" className="py-2 font-semibold max-sm:hidden">
              Expected
            </th>
          </tr>
        </thead>
        {AUDIT_CATEGORIES.map((category) => (
          <tbody key={category}>
            <tr>
              <th scope="colgroup" colSpan={4} className="pt-4 pb-1 font-semibold text-muted">
                {AUDIT_CATEGORY_LABELS[category]}
              </th>
            </tr>
            {audit.checks
              .filter((check) => check.category === category)
              .map((check) => (
                <tr key={check.name} className="border-b border-divider align-top">
                  <th scope="row" className="py-2 pr-4 font-medium">
                    {check.name}
                    {/* On a phone the result sits under the check instead of in its own column. */}
                    <div className="mt-1 sm:hidden">
                      <StatusBadge state={check.status} />
                    </div>
                  </th>
                  <td className="py-2 pr-4 max-sm:hidden">
                    <StatusBadge state={check.status} />
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs break-all">{check.actual}</td>
                  <td className="py-2 text-muted max-sm:hidden">{check.expected}</td>
                </tr>
              ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}

/** Each page the explorer read, with the timings and headers the browser measured on it. */
export function PageChecks({ pages }: Props) {
  const audits = pages.flatMap((page) => (page.audit ? [page.audit] : []));
  if (audits.length === 0) {
    return <p className="text-muted">Checks appear here as the agent reads each page.</p>;
  }
  const checks = audits.reduce((count, audit) => count + audit.checks.length, 0);
  const failed = PageAudit.failed(audits);
  return (
    <div className="space-y-6">
      <p className="max-w-[75ch] text-muted">
        {failed === 0
          ? `All ${plural(checks, 'check')} passed or did not apply on ${plural(audits.length, 'page')}.`
          : `${failed} of ${plural(checks, 'check')} failed on ${plural(audits.length, 'page')}.`}{' '}
        Timings come from the browser on each page the agent read. Security checks are passive:
        TestPilot reads the page&apos;s own response and sends no attacks.
      </p>
      {audits.map((audit) => (
        <section key={audit.url} aria-label={pathOf(audit.url)} className="space-y-1">
          <h3 className="font-mono text-sm">{pathOf(audit.url)}</h3>
          <PageTable audit={audit} />
        </section>
      ))}
    </div>
  );
}
