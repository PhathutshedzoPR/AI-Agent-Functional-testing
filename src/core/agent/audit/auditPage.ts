import { PageAudit } from '../../domain';
import type { PageMeasurement } from '../../ports';
import { performanceChecks } from './performanceChecks';
import { securityChecks } from './securityChecks';

/** Every verdict comes from what the browser measured on the real page; nothing is estimated. */
export function auditPage(page: PageMeasurement): PageAudit {
  return PageAudit.create({
    url: page.url,
    checks: [...performanceChecks(page), ...securityChecks(page)],
  });
}
