export type PurchasingReportChartKind = "line" | "area" | "bar" | "pie";

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
  align?: "left" | "right";
};

export type PurchasingReportCategory =
  | "resumen"
  | "proveedores"
  | "productos"
  | "pagos"
  | "comparativos";

export const PURCHASING_REPORT_CATEGORY_LABEL: Record<PurchasingReportCategory, string> = {
  resumen: "Resumen",
  proveedores: "Proveedores",
  productos: "Productos",
  pagos: "Pagos",
  comparativos: "Comparativos",
};

export const PURCHASING_REPORT_CATEGORY_ORDER: PurchasingReportCategory[] = [
  "resumen",
  "comparativos",
  "proveedores",
  "productos",
  "pagos",
];

export type PurchasingReportCatalogItem = {
  id: string;
  title: string;
  description: string;
  wave: "mvp" | "p1";
  category?: PurchasingReportCategory;
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

export type ReportParamField =
  | { kind: "dateRange"; required?: boolean }
  | { kind: "product"; required?: boolean }
  | { kind: "supplier"; required?: boolean }
  | { kind: "storageMulti" }
  | { kind: "paymentMethod" }
  | { kind: "branch" }
  | { kind: "granularity" }
  | { kind: "compareWith" };

export type ReportRegistryEntry = {
  id: string;
  title: string;
  description: string;
  wave: "mvp" | "p1";
  category: PurchasingReportCategory;
  params: ReportParamField[];
};
