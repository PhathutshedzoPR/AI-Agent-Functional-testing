import type { AuditCheck, AuditStatus } from '../../domain';
import type { PageMeasurement } from '../../ports';

type Context = Readonly<{
  https: boolean;
  local: boolean;
  header: (name: string) => string | null;
}>;

// Local development addresses are served over plain HTTP on purpose.
const isLocalHost = (host: string): boolean =>
  host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host.endsWith('.localhost');

const check = (
  name: string,
  status: AuditStatus,
  actual: string,
  expected: string,
): AuditCheck => ({ category: 'security', name, status, actual, expected });

const passIf = (ok: boolean): AuditStatus => (ok ? 'passed' : 'failed');

function servedOverHttps({ https, local }: Context): AuditCheck {
  const name = 'Served over HTTPS';
  if (https) return check(name, 'passed', 'https', 'https');
  return check(
    name,
    local ? 'skipped' : 'failed',
    local ? 'http on a local address' : 'http',
    'https',
  );
}

// A full Content Security Policy runs to hundreds of characters; the start shows it is there.
const MAX_SHOWN_CHARS = 60;
const shorten = (value: string): string =>
  value.length > MAX_SHOWN_CHARS ? `${value.slice(0, MAX_SHOWN_CHARS - 3)}...` : value;

function headerSet(context: Context, header: string, name: string): AuditCheck {
  const value = context.header(header);
  return check(
    name,
    passIf(value !== null),
    value === null ? 'missing' : shorten(value),
    `a ${header} header`,
  );
}

function noSniffing(context: Context): AuditCheck {
  const value = context.header('x-content-type-options');
  return check(
    'Browsers may not guess file types (MIME sniffing)',
    passIf(value?.trim().toLowerCase() === 'nosniff'),
    value ?? 'missing',
    'X-Content-Type-Options: nosniff',
  );
}

function noFraming(context: Context): AuditCheck {
  const frameOptions = context.header('x-frame-options')?.trim().toUpperCase() ?? null;
  const ancestors = /frame-ancestors\s+([^;]+)/i.exec(
    context.header('content-security-policy') ?? '',
  );
  // frame-ancestors with a * source lets any site frame the page.
  const sources = ancestors?.[1]?.trim().split(/\s+/) ?? null;
  const blocked =
    frameOptions === 'DENY' ||
    frameOptions === 'SAMEORIGIN' ||
    (sources !== null && !sources.includes('*'));
  const actual = [frameOptions && `X-Frame-Options ${frameOptions}`, ancestors?.[0]]
    .filter(Boolean)
    .join(', ');
  return check(
    'Other sites cannot frame the page (clickjacking)',
    passIf(blocked),
    actual || 'missing',
    'X-Frame-Options DENY or SAMEORIGIN, or CSP frame-ancestors',
  );
}

function strictTransport(context: Context): AuditCheck {
  const name = 'Browsers are told to stay on HTTPS (HSTS)';
  const expected = 'a Strict-Transport-Security header';
  if (!context.https) return check(name, 'skipped', 'not served over https', expected);
  const value = context.header('strict-transport-security');
  return check(name, passIf(value !== null), value ?? 'missing', expected);
}

function secureCookies(page: PageMeasurement, { https }: Context): AuditCheck {
  const name = 'Cookies only travel over HTTPS (Secure)';
  const expected = 'every cookie marked Secure';
  if (page.cookies.length === 0) return check(name, 'skipped', 'no cookies', expected);
  if (!https) return check(name, 'skipped', 'not served over https', expected);
  const insecure = page.cookies.filter((cookie) => !cookie.secure).map((cookie) => cookie.name);
  return check(
    name,
    passIf(insecure.length === 0),
    insecure.length === 0 ? 'all Secure' : `not Secure: ${insecure.join(', ')}`,
    expected,
  );
}

/**
 * Passive checks on the page's own response: what a scanner would flag as a misconfiguration.
 * Nothing is sent to the site beyond the page visit itself.
 */
export function securityChecks(page: PageMeasurement): AuditCheck[] {
  const url = new URL(page.url);
  const context: Context = {
    https: url.protocol === 'https:',
    local: isLocalHost(url.hostname),
    header: (name) => page.headers[name] ?? null,
  };
  return [
    servedOverHttps(context),
    headerSet(context, 'content-security-policy', 'Content Security Policy is set'),
    noSniffing(context),
    noFraming(context),
    headerSet(context, 'referrer-policy', 'Referrer Policy is set'),
    strictTransport(context),
    secureCookies(page, context),
  ];
}
