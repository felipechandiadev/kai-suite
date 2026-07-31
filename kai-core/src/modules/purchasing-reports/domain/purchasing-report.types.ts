export type PurchasingReportChartKind = 'line' | 'area' | 'bar' | 'pie';

export type PurchasingReportSeriesPoint = {
  x: string;
  y: number;
  y2?: number;
};

export type PurchasingReportSeries = {
  id: string;
  label: string;
  chart: PurchasingReportChartKind;
  points: PurchasingReportSeriesPoint[];
};

export type PurchasingReportColumn = {
  key: string;
  label: string;
  align?: 'left' | 'right';
};

export type PurchasingReportCatalogItem = {
  id: string;
  title: string;
  description: string;
  wave: 'mvp' | 'p1';
};

export type PurchasingReportSummaryDelta = {
  current: number;
  previous: number;
  deltaPct: number | null;
};

export type PurchasingReportRunResult = {
  reportId: string;
  title: string;
  generatedAt: string;
  params: Record<string, unknown>;
  summary: Record<string, number | string>;
  summaryDelta?: Record<string, PurchasingReportSummaryDelta>;
  series: PurchasingReportSeries[];
  columns: PurchasingReportColumn[];
  rows: Record<string, unknown>[];
  totals?: Record<string, number>;
  footnotes?: string[];
  truncated?: boolean;
};

export type PurchasingReportHandlerContext = {
  companyId: string;
  params: Record<string, unknown>;
};

export interface PurchasingReportHandler {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly wave: 'mvp' | 'p1';
  validate(params: Record<string, unknown>): Record<string, unknown>;
  run(ctx: PurchasingReportHandlerContext): Promise<PurchasingReportRunResult>;
}

export const PURCHASING_REPORT_MAX_ROWS = 1000;

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

export function computeDeltaPct(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}

export function buildSummaryDelta(
  current: Record<string, number>,
  previous: Record<string, number>,
): Record<string, PurchasingReportSummaryDelta> {
  const out: Record<string, PurchasingReportSummaryDelta> = {};
  for (const key of Object.keys(current)) {
    const c = current[key] ?? 0;
    const p = previous[key] ?? 0;
    out[key] = { current: c, previous: p, deltaPct: computeDeltaPct(c, p) };
  }
  return out;
}
