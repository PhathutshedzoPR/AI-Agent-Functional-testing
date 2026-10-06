type Level = 'info' | 'warn' | 'error';
type Fields = Readonly<Record<string, unknown>>;

const SECRET_KEY = /key|token|secret|password|authorization|cookie/i;
const REDACTED = '[redacted]';

export type Logger = Readonly<{
  info: (message: string, fields?: Fields) => void;
  warn: (message: string, fields?: Fields) => void;
  error: (message: string, fields?: Fields) => void;
}>;

/** Deep-copies `value` for logging, hiding anything under a secret-looking key. */
export function redact(value: unknown, depth = 0): unknown {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  if (depth > 5 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));
  return Object.fromEntries(
    Object.entries(value).map(([key, inner]) => [
      key,
      SECRET_KEY.test(key) ? REDACTED : redact(inner, depth + 1),
    ]),
  );
}

/** Structured JSON-line logs on stdout and stderr. Stack traces stay here, never in responses. */
export function createLogger(write: (level: Level, line: string) => void = defaultWrite): Logger {
  const log =
    (level: Level) =>
    (message: string, fields: Fields = {}) => {
      write(
        level,
        JSON.stringify({
          time: new Date().toISOString(),
          level,
          message,
          ...(redact(fields) as Fields),
        }),
      );
    };
  return { info: log('info'), warn: log('warn'), error: log('error') };
}

function defaultWrite(level: Level, line: string): void {
  (level === 'error' ? process.stderr : process.stdout).write(`${line}\n`);
}

export const logger: Logger = createLogger();
