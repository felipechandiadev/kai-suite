export type HcmReportChartKind = "line" | "area" | "bar" | "pie";

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
  align?: "left" | "right";
};

export type HcmReportCategory = "jornada";

export const HCM_REPORT_CATEGORY_LABEL: Record<HcmReportCategory, string> = {
  jornada: "Jornada",
};

export const HCM_REPORT_CATEGORY_ORDER: HcmReportCategory[] = ["jornada"];

export type HcmReportCatalogItem = {
  id: string;
  title: string;
  description: string;
  wave: "mvp" | "p1";
  category?: HcmReportCategory;
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
};

export type ReportParamField =
  | { kind: "dateRange"; required?: boolean }
  | { kind: "laborUnit" }
  | { kind: "employeeMulti" };

export type ReportRegistryEntry = {
  id: string;
  title: string;
  description: string;
  wave: "mvp" | "p1";
  category: HcmReportCategory;
  params: ReportParamField[];
};
