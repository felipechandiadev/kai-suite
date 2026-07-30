"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  rechartsChartCursor,
  rechartsTooltipContentStyle,
  rechartsTooltipWrapperStyle,
} from "@/shared/charts/recharts-tooltip";
import {
  formatReportAxisLabel,
  formatReportCount,
  formatReportMoney,
  translateEnumValue,
} from "@/features/sales-reports/lib/report-dates";
import type { SalesReportSeries } from "@/features/sales-reports/types/sales-report.types";

const primary = "var(--color-primary, #002b59)";
const secondary = "var(--color-secondary, #04c9e6)";
const muted = "var(--color-muted-foreground, #7a8280)";
const border = "var(--color-border, #c1c1c2)";
const PIE_COLORS = [primary, secondary, "#0d9488", "#ca8a04", "#dc2626", "#7c3aed", "#ea580c"];

type Props = {
  series: SalesReportSeries[];
};

/** Series de cantidad (no CLP). El resto se trata como pesos. */
function isCountSeries(series: SalesReportSeries): boolean {
  const t = `${series.id} ${series.label}`.toLowerCase();
  return /(qty|cantidad|redencion|cotizacion|encargo|por estado|por promoción|usos|count)/.test(
    t,
  );
}

function formatChartValue(value: unknown, asMoney: boolean): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return value == null ? "—" : String(value);
  }
  return asMoney ? formatReportMoney(value) : formatReportCount(value);
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="fs-chart-surface break-inside-avoid rounded-lg border border-border bg-background p-3 print:border-neutral-300">
      <h3 className="mb-2 text-sm font-semibold text-foreground">{title}</h3>
      <div className="h-[220px] w-full min-w-0 print:h-[200px]">{children}</div>
    </div>
  );
}

function SingleChart({ series }: { series: SalesReportSeries }) {
  const asMoney = !isCountSeries(series);
  const data = series.points.map((p) => ({
    label: formatReportAxisLabel(p.x),
    value: p.y,
    value2: p.y2,
  }));
  const tickFormatter = (v: number) => formatChartValue(v, asMoney);
  const tooltipFormatter = (value: number | string | undefined) => [
    formatChartValue(value, asMoney),
    series.label,
  ];
  const yAxisWidth = asMoney ? 72 : 44;

  if (!data.length) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Sin datos para graficar
      </div>
    );
  }

  if (series.chart === "pie") {
    return (
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={180}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="50%"
            outerRadius={80}
            label={({ name, percent, value }) =>
              `${translateEnumValue(name)} ${formatChartValue(value, asMoney)} (${((percent ?? 0) * 100).toFixed(0)}%)`
            }
          >
            {data.map((_, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            cursor={rechartsChartCursor}
            contentStyle={rechartsTooltipContentStyle}
            wrapperStyle={rechartsTooltipWrapperStyle}
            formatter={(value) => tooltipFormatter(value as number)}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (series.chart === "line") {
    return (
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={180}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={border} strokeDasharray="4 8" vertical={false} opacity={0.65} />
          <XAxis dataKey="label" tick={{ fill: muted, fontSize: 10 }} tickLine={false} />
          <YAxis
            tick={{ fill: muted, fontSize: 10 }}
            tickLine={false}
            width={yAxisWidth}
            tickFormatter={tickFormatter}
          />
          <Tooltip
            cursor={rechartsChartCursor}
            contentStyle={rechartsTooltipContentStyle}
            wrapperStyle={rechartsTooltipWrapperStyle}
            formatter={(value) => tooltipFormatter(value as number)}
          />
          <Line type="monotone" dataKey="value" stroke={primary} strokeWidth={2} dot={false} />
          {data.some((d) => d.value2 != null) ? (
            <Line type="monotone" dataKey="value2" stroke={secondary} strokeWidth={2} dot={false} />
          ) : null}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (series.chart === "area") {
    return (
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={180}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`fill-${series.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={primary} stopOpacity={0.35} />
              <stop offset="100%" stopColor={primary} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={border} strokeDasharray="4 8" vertical={false} opacity={0.65} />
          <XAxis dataKey="label" tick={{ fill: muted, fontSize: 10 }} tickLine={false} />
          <YAxis
            tick={{ fill: muted, fontSize: 10 }}
            tickLine={false}
            width={yAxisWidth}
            tickFormatter={tickFormatter}
          />
          <Tooltip
            cursor={rechartsChartCursor}
            contentStyle={rechartsTooltipContentStyle}
            wrapperStyle={rechartsTooltipWrapperStyle}
            formatter={(value) => tooltipFormatter(value as number)}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={primary}
            fill={`url(#fill-${series.id})`}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={180}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={border} strokeDasharray="4 8" vertical={false} opacity={0.65} />
        <XAxis dataKey="label" tick={{ fill: muted, fontSize: 10 }} tickLine={false} />
        <YAxis
          tick={{ fill: muted, fontSize: 10 }}
          tickLine={false}
          width={yAxisWidth}
          tickFormatter={tickFormatter}
        />
        <Tooltip
          cursor={rechartsChartCursor}
          contentStyle={rechartsTooltipContentStyle}
          wrapperStyle={rechartsTooltipWrapperStyle}
          formatter={(value) => tooltipFormatter(value as number)}
        />
        <Bar dataKey="value" fill={primary} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ReportCharts({ series }: Props) {
  if (!series.length) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Este reporte no devolvió series para graficar.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2 print:grid-cols-1">
      {series.map((s) => (
        <ChartCard key={s.id} title={s.label}>
          <SingleChart series={s} />
        </ChartCard>
      ))}
    </div>
  );
}
