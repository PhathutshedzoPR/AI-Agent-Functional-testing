import { resolve, sep } from 'node:path';
import { ValidationError } from '@/core/errors';

const UUID = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;

/**
 * A path inside `root` built only from server-generated UUIDs (CLAUDE.md section 4, item 7),
 * never from user text. The final prefix check is defence in depth.
 */
export function idPath(
  root: string,
  ids: readonly string[],
  fileName: (last: string) => string,
): string {
  if (ids.length === 0 || !ids.every((id) => UUID.test(id))) {
    throw new ValidationError('Stored file ids must be UUIDs.');
  }
  const folders = ids.slice(0, -1);
  const last = ids.at(-1) ?? '';
  const path = resolve(root, ...folders, fileName(last));
  if (!path.startsWith(root + sep)) {
    throw new ValidationError('A stored file path escaped its folder.');
  }
  return path;
}

export function isMissingFile(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}
