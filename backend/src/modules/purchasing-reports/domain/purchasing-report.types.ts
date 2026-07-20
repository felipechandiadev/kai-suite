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

export type PurchasingReportRunResult = {
  reportId: string;
  title: string;
  generatedAt: string;
  params: Record<string, unknown>;
  summary: Record<string, number | string>;
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
