import type { RunView } from '@/core/domain';

/** A safe, readable file name: testpilot-kota-express-buggy-1a2b3c4d.<extension>. */
export function reportFileName(view: RunView, extension: string): string {
  const label = (view.targetLabel ?? 'run')
    .toLowerCase()
    .split(/[^a-z\d]+/)
    .filter(Boolean)
    .join('-')
    .slice(0, 40);
  const id = (view.runId ?? 'unknown').slice(0, 8);
  return `testpilot-${label || 'run'}-${id}.${extension}`;
}
