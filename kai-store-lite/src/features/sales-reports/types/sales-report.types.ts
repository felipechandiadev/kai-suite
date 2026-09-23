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

export type SalesReportCategory =
  | "resumen"
  | "productos"
  | "caja_pagos"
  | "comparativos";

export const SALES_REPORT_CATEGORY_LABEL: Record<SalesReportCategory, string> = {
  resumen: "Resumen",
  productos: "Productos",
  caja_pagos: "Caja y pagos",
  comparativos: "Comparativos",
};

export const SALES_REPORT_CATEGORY_ORDER: SalesReportCategory[] = [
  "resumen",
  "comparativos",
  "productos",
  "caja_pagos",
];

export type SalesReportCatalogItem = {
  id: string;
  title: string;
  description: string;
  wave: "mvp" | "p1";
  category?: SalesReportCategory;
};

export type SalesReportSummaryDelta = {
  current: number;
  previous: number;
  deltaPct: number | null;
};

export type SalesReportRunResult = {
  reportId: string;
  title: string;
  generatedAt: string;
  params: Record<string, unknown>;
  summary: Record<string, number | string>;
  summaryDelta?: Record<string, SalesReportSummaryDelta>;
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
  | { kind: "paymentMethod" }
  | { kind: "cashSession" }
  | { kind: "topN"; default?: number }
  | { kind: "promotion" }
  | { kind: "granularity" }
  | { kind: "compareWith" };

export type ReportRegistryEntry = {
  id: string;
  title: string;
  description: string;
  wave: "mvp" | "p1";
  category: SalesReportCategory;
  params: ReportParamField[];
};
