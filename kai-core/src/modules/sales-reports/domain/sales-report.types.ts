export type SalesReportChartKind = 'line' | 'area' | 'bar' | 'pie';

export type SalesReportSeriesPoint = {
  x: string;
  y: number;
  y2?: number;
};

export type SalesReportSeries = {
  id: string;
  label: string;
  chart: SalesReportChartKind;
  points: SalesReportSeriesPoint[];
};

export type SalesReportColumn = {
  key: string;
  label: string;
  align?: 'left' | 'right';
};

export type SalesReportMarginQuality = {
  linesWithCost: number;
  linesMissingCost: number;
  coveragePct: number;
};

export type SalesReportCatalogItem = {
  id: string;
  title: string;
  description: string;
  wave: 'mvp' | 'p1';
};

export type SalesReportRunResult = {
  reportId: string;
  title: string;
  generatedAt: string;
  params: Record<string, unknown>;
  summary: Record<string, number | string>;
  series: SalesReportSeries[];
  columns: SalesReportColumn[];
  rows: Record<string, unknown>[];
  totals?: Record<string, number>;
  footnotes?: string[];
  truncated?: boolean;
  marginQuality?: SalesReportMarginQuality;
};

export type SalesReportHandlerContext = {
  companyId: string;
  params: Record<string, unknown>;
};

export interface SalesReportHandler {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly wave: 'mvp' | 'p1';
  validate(params: Record<string, unknown>): Record<string, unknown>;
  run(ctx: SalesReportHandlerContext): Promise<SalesReportRunResult>;
}

export const SALES_REPORT_MAX_ROWS = 1000;
