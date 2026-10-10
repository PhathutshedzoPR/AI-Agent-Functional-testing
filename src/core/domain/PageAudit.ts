import { z } from 'zod';
import { AUDIT_CATEGORIES, AUDIT_STATUSES } from './constants';
import { parseDomain } from './parseDomain';

/** One measured check on a page: a timing against its budget, or a security header. */
export const AuditCheckSchema = z.object({
  category: z.enum(AUDIT_CATEGORIES),
  name: z.string().min(1),
  /** `skipped` when the check does not apply, such as HTTPS on a local address. */
  status: z.enum(AUDIT_STATUSES),
  actual: z.string(),
  expected: z.string(),
});
export type AuditCheck = z.infer<typeof AuditCheckSchema>;
export type AuditCategory = AuditCheck['category'];
export type AuditStatus = AuditCheck['status'];

/** The performance and security checks for one page the explorer read. */
export const PageAuditSchema = z.object({
  url: z.string(),
  checks: z.array(AuditCheckSchema),
});
export type PageAudit = z.infer<typeof PageAuditSchema>;

export const PageAudit = {
  create(input: unknown): PageAudit {
    return parseDomain(PageAuditSchema, input, 'page audit');
  },

  failed(audits: readonly PageAudit[]): number {
    return audits.reduce(
      (count, audit) => count + audit.checks.filter((check) => check.status === 'failed').length,
      0,
    );
  },
} as const;
