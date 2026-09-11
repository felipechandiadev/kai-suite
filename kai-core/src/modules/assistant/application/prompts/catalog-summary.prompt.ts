import { listDatasetCatalogs } from '../../domain/semantic-catalog';

export function buildCatalogSummaryPrompt(): string {
  const lines = listDatasetCatalogs().map((c) => {
    const metrics = c.metrics.map((m) => `${m.id} (${m.label})`).join(', ');
    const dims = c.dimensions.map((d) => `${d.id} (${d.label})`).join(', ');
    return `- ${c.dataset}: métricas [${metrics}]; dimensiones [${dims}]`;
  });
  return `Catálogo semántico v0:\n${lines.join('\n')}`;
}
