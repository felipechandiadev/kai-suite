export type SalesReportChartKind = "line" | "area" | "bar" | "pie";

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
  align?: "left" | "right";
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
  wave: "mvp" | "p1";
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

export type ReportParamField =
  | { kind: "dateRange"; required?: boolean }
  | { kind: "product"; required?: boolean }
  | { kind: "customer"; required?: boolean }
  | { kind: "posMulti" }
  | { kind: "paymentMethod" }
  | { kind: "cashSession" }
  | { kind: "topN"; default?: number }
  | { kind: "promotion" };

export type ReportRegistryEntry = {
  id: string;
  title: string;
  description: string;
  wave: "mvp" | "p1";
  params: ReportParamField[];
};
