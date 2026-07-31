export type InventoryReportChartKind = "line" | "area" | "bar" | "pie";

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
  align?: "left" | "right";
};

export type InventoryReportCategory =
  | "valuacion"
  | "alertas"
  | "stock"
  | "movimientos"
  | "comparativos";

export const INVENTORY_REPORT_CATEGORY_LABEL: Record<
  InventoryReportCategory,
  string
> = {
  valuacion: "Valuación",
  alertas: "Alertas",
  stock: "Stock",
  movimientos: "Movimientos",
  comparativos: "Comparativos",
};

export const INVENTORY_REPORT_CATEGORY_ORDER: InventoryReportCategory[] = [
  "valuacion",
  "alertas",
  "stock",
  "movimientos",
  "comparativos",
];

export type InventoryReportCatalogItem = {
  id: string;
  title: string;
  description: string;
  wave: "mvp" | "p1";
  category?: InventoryReportCategory;
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

export type ReportParamField =
  | { kind: "dateRange"; required?: boolean }
  | { kind: "product"; required?: boolean }
  | { kind: "storageMulti" }
  | { kind: "stockUnitMulti"; required?: boolean }
  | { kind: "categoryMulti" }
  | { kind: "granularity" }
  | { kind: "compareWith" };

export type ReportRegistryEntry = {
  id: string;
  title: string;
  description: string;
  wave: "mvp" | "p1";
  category: InventoryReportCategory;
  params: ReportParamField[];
};
