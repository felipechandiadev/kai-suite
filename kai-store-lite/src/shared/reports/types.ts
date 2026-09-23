export type ReportChartKind = "line" | "area" | "bar" | "pie";

export type ReportSeriesPoint = {
  x: string;
  y: number;
  y2?: number;
};

export type ReportChartSeries = {
  id: string;
  label: string;
  chart: ReportChartKind;
  points: ReportSeriesPoint[];
};

export type ReportSummaryDelta = {
  current: number;
  previous: number;
  deltaPct: number | null;
};
