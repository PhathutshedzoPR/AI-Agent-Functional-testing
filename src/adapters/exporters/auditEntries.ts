import type { AuditCheck, RunView } from '@/core/domain';

export type AuditEntry = Readonly<{ page: string; check: AuditCheck }>;

/** Every performance and security check of the run, with the path of the page it was made on. */
export function auditEntries(view: RunView): AuditEntry[] {
  return view.pages.flatMap((page) => {
    if (!page.audit) return [];
    let path = page.audit.url;
    try {
      path = new URL(page.audit.url).pathname;
    } catch {
      // Keep the address as it was recorded.
    }
    return page.audit.checks.map((check) => ({ page: path, check }));
  });
}
