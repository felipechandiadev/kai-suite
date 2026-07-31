export type InventoryReportChartKind = 'line' | 'area' | 'bar' | 'pie';

export type InventoryReportSeriesPoint = {
  x: string;
  y: number;
  y2?: number;
};

export type InventoryReportSeries = {
  id: string;
  label: string;
  chart: InventoryReportChartKind;
  points: InventoryReportSeriesPoint[];
};

export type InventoryReportColumn = {
  key: string;
  label: string;
  align?: 'left' | 'right';
};

export type InventoryReportCatalogItem = {
  id: string;
  title: string;
  description: string;
  wave: 'mvp' | 'p1';
};

export type InventoryReportSummaryDelta = {
  current: number;
  previous: number;
  deltaPct: number | null;
};

export type InventoryReportRunResult = {
  reportId: string;
  title: string;
  generatedAt: string;
  params: Record<string, unknown>;
  summary: Record<string, number | string>;
  summaryDelta?: Record<string, InventoryReportSummaryDelta>;
  series: InventoryReportSeries[];
  columns: InventoryReportColumn[];
  rows: Record<string, unknown>[];
  totals?: Record<string, number>;
  footnotes?: string[];
  truncated?: boolean;
};

export type InventoryReportHandlerContext = {
  companyId: string;
  params: Record<string, unknown>;
};

export interface InventoryReportHandler {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly wave: 'mvp' | 'p1';
  validate(params: Record<string, unknown>): Record<string, unknown>;
  run(ctx: InventoryReportHandlerContext): Promise<InventoryReportRunResult>;
}

export const INVENTORY_REPORT_MAX_ROWS = 1000;

export type ReportGranularity = 'day' | 'week' | 'month';
export type CompareWith = 'none' | 'previousPeriod' | 'samePeriodLastYear';

export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function daysInRange(dateFrom: string, dateTo: string): number {
  const a = new Date(`${dateFrom}T00:00:00`);
  const b = new Date(`${dateTo}T00:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1);
}

export function resolveGranularity(
  raw: unknown,
  dateFrom: string,
  dateTo: string,
): ReportGranularity {
  if (raw === 'day' || raw === 'week' || raw === 'month') return raw;
  const days = daysInRange(dateFrom, dateTo);
  if (days <= 45) return 'day';
  if (days <= 180) return 'week';
  return 'month';
}

export function parseCompareWith(raw: unknown): CompareWith {
  if (raw === 'previousPeriod' || raw === 'samePeriodLastYear') return raw;
  return 'none';
}

export function compareDateRange(
  dateFrom: string,
  dateTo: string,
  mode: CompareWith,
): { dateFrom: string; dateTo: string } | null {
  if (mode === 'none') return null;
  const from = new Date(`${dateFrom}T00:00:00`);
  const to = new Date(`${dateTo}T00:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
  const days = daysInRange(dateFrom, dateTo);
  if (mode === 'samePeriodLastYear') {
    const prevFrom = new Date(from);
    prevFrom.setFullYear(prevFrom.getFullYear() - 1);
    const prevTo = new Date(to);
    prevTo.setFullYear(prevTo.getFullYear() - 1);
    return { dateFrom: toIsoDate(prevFrom), dateTo: toIsoDate(prevTo) };
  }
  const prevTo = new Date(from);
  prevTo.setDate(prevTo.getDate() - 1);
  const prevFrom = new Date(prevTo);
  prevFrom.setDate(prevFrom.getDate() - (days - 1));
  return { dateFrom: toIsoDate(prevFrom), dateTo: toIsoDate(prevTo) };
}

export function computeDeltaPct(
  current: number,
  previous: number,
): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}

export function buildSummaryDelta(
  current: Record<string, number>,
  previous: Record<string, number>,
): Record<string, InventoryReportSummaryDelta> {
  const out: Record<string, InventoryReportSummaryDelta> = {};
  for (const key of Object.keys(current)) {
    const c = current[key] ?? 0;
    const p = previous[key] ?? 0;
    out[key] = { current: c, previous: p, deltaPct: computeDeltaPct(c, p) };
  }
  return out;
}

/**
 * Clave de bucket (UTC) para agregaciones en memoria de movimientos:
 * día `YYYY-MM-DD`, semana ISO `IYYY-Www`, mes `YYYY-MM`.
 */
export function inventoryBucketKey(
  date: Date,
  granularity: ReportGranularity,
): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  if (granularity === 'month') return `${y}-${m}`;
  if (granularity === 'week') {
    // ISO 8601: jueves de la misma semana define año y número de semana
    const thursday = new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
    );
    const dayNum = thursday.getUTCDay() || 7;
    thursday.setUTCDate(thursday.getUTCDate() + 4 - dayNum);
    const yearStart = Date.UTC(thursday.getUTCFullYear(), 0, 1);
    const week = Math.ceil(
      ((thursday.getTime() - yearStart) / 86_400_000 + 1) / 7,
    );
    return `${thursday.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
  }
  return `${y}-${m}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

/** Etiqueta de columna del bucket según granularidad. */
export function bucketColumnLabel(granularity: ReportGranularity): string {
  if (granularity === 'month') return 'Mes';
  if (granularity === 'week') return 'Semana';
  return 'Día';
}

/** Etiqueta en singular para títulos de series ("por día", "por mes"). */
export function bucketGrainLabel(granularity: ReportGranularity): string {
  if (granularity === 'month') return 'mes';
  if (granularity === 'week') return 'semana';
  return 'día';
}

/** Alinea buckets actual vs comparación por índice (mismos largos de período). */
export function mergeBucketPoints(
  current: Array<{ x: string; y: number }>,
  previous: Array<{ x: string; y: number }>,
): InventoryReportSeriesPoint[] {
  const len = Math.max(current.length, previous.length);
  const points: InventoryReportSeriesPoint[] = [];
  for (let i = 0; i < len; i++) {
    const cur = current[i];
    const prev = previous[i];
    points.push({
      x: cur?.x ?? prev?.x ?? String(i + 1),
      y: cur?.y ?? 0,
      y2: prev != null ? prev.y : undefined,
    });
  }
  return points;
}
