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

export type InventoryReportCatalogItem = {
  id: string;
  title: string;
  description: string;
  wave: "mvp" | "p1";
};

export type InventoryReportRunResult = {
  reportId: string;
  title: string;
  generatedAt: string;
  params: Record<string, unknown>;
  summary: Record<string, number | string>;
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
  | { kind: "storageMulti" };

export type ReportRegistryEntry = {
  id: string;
  title: string;
  description: string;
  wave: "mvp" | "p1";
  params: ReportParamField[];
};
