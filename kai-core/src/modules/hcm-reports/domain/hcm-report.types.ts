export type HcmReportChartKind = 'line' | 'area' | 'bar' | 'pie';

export type HcmReportSeriesPoint = {
  x: string;
  y: number;
  y2?: number;
};

export type HcmReportSeries = {
  id: string;
  label: string;
  chart: HcmReportChartKind;
  points: HcmReportSeriesPoint[];
};

export type HcmReportColumn = {
  key: string;
  label: string;
  align?: 'left' | 'right';
};

export type HcmReportCatalogItem = {
  id: string;
  title: string;
  description: string;
  wave: 'mvp' | 'p1';
};

export type HcmReportRunResult = {
  reportId: string;
  title: string;
  generatedAt: string;
  params: Record<string, unknown>;
  summary: Record<string, number | string>;
  series: HcmReportSeries[];
  columns: HcmReportColumn[];
  rows: Record<string, unknown>[];
  totals?: Record<string, number>;
  footnotes?: string[];
  truncated?: boolean;
  certified?: boolean;
};

export type HcmReportHandlerContext = {
  companyId: string;
  params: Record<string, unknown>;
};

export interface HcmReportHandler {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly wave: 'mvp' | 'p1';
  validate(params: Record<string, unknown>): Record<string, unknown>;
  run(ctx: HcmReportHandlerContext): Promise<HcmReportRunResult>;
}

export const HCM_REPORT_MAX_ROWS = 1000;
