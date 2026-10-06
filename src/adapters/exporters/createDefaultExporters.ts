import type { IReportExporter } from '@/core/ports';
import { JsonExporter } from './JsonExporter';
import { JUnitExporter } from './JUnitExporter';
import { MarkdownExporter } from './MarkdownExporter';
import { PlaywrightSpecExporter } from './PlaywrightSpecExporter';

/** Every export format. A new one is one exporter class plus one line here. */
export function createDefaultExporters(): readonly IReportExporter[] {
  return [
    new JsonExporter(),
    new JUnitExporter(),
    new MarkdownExporter(),
    new PlaywrightSpecExporter(),
  ];
}
