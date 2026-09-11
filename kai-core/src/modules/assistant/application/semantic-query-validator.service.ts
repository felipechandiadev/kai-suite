import { Injectable } from '@nestjs/common';
import { SamiQuery, SamiQueryError } from '../domain/sami-query.types';
import { getDatasetCatalog } from '../domain/semantic-catalog';

const DATASETS = new Set(['sales', 'inventory', 'purchasing', 'dining', 'catalog']);

@Injectable()
export class SemanticQueryValidator {
  validate(
    raw: unknown,
    opts: { isAdmin: boolean; maxRows: number },
  ): SamiQuery {
    if (!raw || typeof raw !== 'object') {
      throw new SamiQueryError('SAMI_INVALID_QUERY', 'Consulta semántica inválida.');
    }
    const q = raw as Record<string, unknown>;
    if (q.version !== 1) {
      throw new SamiQueryError('SAMI_INVALID_QUERY', 'version debe ser 1.');
    }
    if (q.source !== 'semantic') {
      throw new SamiQueryError('SAMI_INVALID_QUERY', 'source debe ser semantic.');
    }
    const dataset = String(q.dataset ?? '');
    if (!DATASETS.has(dataset)) {
      throw new SamiQueryError('SAMI_UNKNOWN_DATASET', `Dataset desconocido: ${dataset}`);
    }
    const metrics = Array.isArray(q.metrics)
      ? q.metrics.map((m) => String(m))
      : [];
    if (metrics.length < 1 || metrics.length > 3) {
      throw new SamiQueryError('SAMI_INVALID_QUERY', 'Se requiere 1 a 3 métricas.');
    }
    const catalog = getDatasetCatalog(dataset as SamiQuery['dataset']);
    for (const id of metrics) {
      const m = catalog.metrics.find((x) => x.id === id);
      if (!m) {
        throw new SamiQueryError('SAMI_UNKNOWN_METRIC', `Métrica desconocida: ${id}`);
      }
      if (m.adminOnly && !opts.isAdmin) {
        throw new SamiQueryError(
          'SAMI_FORBIDDEN_METRIC',
          `La métrica ${id} requiere rol ADMIN.`,
        );
      }
    }
    const dimensions = Array.isArray(q.dimensions)
      ? q.dimensions.map((d) => String(d)).slice(0, 2)
      : [];
    for (const id of dimensions) {
      if (!catalog.dimensions.some((d) => d.id === id)) {
        throw new SamiQueryError(
          'SAMI_UNKNOWN_DIMENSION',
          `Dimensión desconocida: ${id}`,
        );
      }
    }
    const filters = Array.isArray(q.filters) ? q.filters : [];
    const needsDate = Boolean(catalog.dateField);
    const hasDate = filters.some((f) => {
      if (!f || typeof f !== 'object') return false;
      const field = String((f as { field?: string }).field ?? '');
      return field === 'date' || field === 'dateFrom';
    });
    if (needsDate && !hasDate) {
      throw new SamiQueryError(
        'SAMI_MISSING_DATE',
        'Indicá un periodo (filtros date / between).',
      );
    }
    const limitRaw = Number(q.limit ?? 100);
    const limit = Math.min(
      Math.max(Number.isFinite(limitRaw) ? limitRaw : 100, 1),
      opts.maxRows,
    );
    return {
      version: 1,
      source: 'semantic',
      dataset: dataset as SamiQuery['dataset'],
      metrics,
      dimensions,
      filters: filters as SamiQuery['filters'],
      orderBy: Array.isArray(q.orderBy)
        ? (q.orderBy as SamiQuery['orderBy'])
        : undefined,
      limit,
      chart: (q.chart as SamiQuery['chart']) ?? undefined,
    };
  }
}
