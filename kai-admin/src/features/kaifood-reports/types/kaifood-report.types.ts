export type DiningReportChartKind = "line" | "area" | "bar" | "pie";

export type DiningReportSeriesPoint = {
  x: string;
  y: number;
  y2?: number;
};

export type DiningReportSeries = {
  id: string;
  label: string;
  chart: DiningReportChartKind;
  points: DiningReportSeriesPoint[];
};

export type DiningReportColumn = {
  key: string;
  label: string;
  align?: "left" | "right";
};

export type KaifoodReportCategory = "resumen" | "operacion" | "comparativos";

export const KAIFOOD_REPORT_CATEGORY_LABEL: Record<KaifoodReportCategory, string> =
  {
    resumen: "Resumen",
    operacion: "Operación",
    comparativos: "Comparativos",
  };

export const KAIFOOD_REPORT_CATEGORY_ORDER: KaifoodReportCategory[] = [
  "resumen",
  "operacion",
  "comparativos",
];

export type DiningReportCatalogItem = {
  id: string;
  title: string;
  description: string;
  wave: "mvp" | "p1";
  category?: KaifoodReportCategory;
};

export type DiningReportSummaryDelta = {
  current: number;
  previous: number;
  deltaPct: number | null;
};

export type DiningReportRunResult = {
  reportId: string;
  title: string;
  generatedAt: string;
  params: Record<string, unknown>;
  summary: Record<string, number | string>;
  summaryDelta?: Record<string, DiningReportSummaryDelta>;
  series: DiningReportSeries[];
  columns: DiningReportColumn[];
  rows: Record<string, unknown>[];
  totals?: Record<string, number>;
  footnotes?: string[];
  truncated?: boolean;
};

export type ReportParamField =
  | { kind: "dateRange"; required?: boolean }
  | { kind: "branch" }
  | { kind: "diningRoom" }
  | { kind: "orderKind" }
  | { kind: "granularity" }
  | { kind: "compareWith" };

export type ReportRegistryEntry = {
  id: string;
  title: string;
  description: string;
  wave: "mvp" | "p1";
  category: KaifoodReportCategory;
  params: ReportParamField[];
};
