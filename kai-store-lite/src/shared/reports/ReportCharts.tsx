"use client";

import {
  formatReportAxisLabel,
  formatReportCount,
  formatReportMoney,
  translateEnumValue,
} from "@/shared/reports/report-dates";
import type { ReportChartSeries } from "@/shared/reports/types";
import { useEffect, useRef, useState } from "react";
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
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  rechartsChartCursor,
  rechartsTooltipContentStyle,
  rechartsTooltipWrapperStyle,
} from "@/shared/charts/recharts-tooltip";

const primary = "var(--color-primary, #002b59)";
const secondary = "var(--color-secondary, #04c9e6)";
const muted = "var(--color-muted-foreground, #7a8280)";
const border = "var(--color-border, #c1c1c2)";
const PIE_COLORS = [primary, secondary, "#0d9488", "#ca8a04", "#dc2626", "#7c3aed", "#ea580c"];

type Props = {
  series: ReportChartSeries[];
};

function isCountSeries(series: ReportChartSeries): boolean {
  const t = `${series.id} ${series.label}`.toLowerCase();
  return /(qty|cantidad|redencion|cotizacion|encargo|por estado|por promoción|usos|count|stock|movimiento|unidad)/.test(
    t,
  );
}

function formatChartValue(value: unknown, asMoney: boolean): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return value == null ? "—" : String(value);
  }
  return asMoney ? formatReportMoney(value) : formatReportCount(value, "qty");
}

const PRINT_CHART_MAX_WIDTH = 680;

function useStableChartSize(active: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 480, height: 200 });

  useEffect(() => {
    const el = ref.current;
    if (!active || !el) return;

    const apply = (width: number, height: number) => {
      if (window.matchMedia("print").matches) return;
      if (width <= 0 || height <= 0) return;
      setSize({ width: Math.floor(width), height: Math.floor(height) });
    };

    const measure = () => {
      const rect = el.getBoundingClientRect();
      apply(rect.width, rect.height);
    };

    measure();
    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (!box) return;
      apply(box.width, box.height);
    });
    observer.observe(el);

    const onBeforePrint = () => {
      setSize((current) => ({
        width: Math.min(current.width, PRINT_CHART_MAX_WIDTH),
        height: current.height,
      }));
    };
    const onAfterPrint = () => measure();
    window.addEventListener("beforeprint", onBeforePrint);
    window.addEventListener("afterprint", onAfterPrint);

    return () => {
      observer.disconnect();
      window.removeEventListener("beforeprint", onBeforePrint);
      window.removeEventListener("afterprint", onAfterPrint);
    };
  }, [active]);

  return { ref, size };
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="fs-chart-surface break-inside-avoid rounded-lg border border-border bg-background p-3 print:border-neutral-300">
      <h3 className="mb-2 text-sm font-semibold text-foreground">{title}</h3>
      <div className="h-55 w-full min-w-0 print:h-50">{children}</div>
    </div>
  );
}

function finitePoint(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function SingleChart({ series }: { series: ReportChartSeries }) {
  const asMoney = !isCountSeries(series);
  const points = Array.isArray(series.points) ? series.points : [];
  const data = points.flatMap((p) => {
    if (!p || typeof p.x !== "string" || !p.x.trim()) return [];
    const value = finitePoint(p.y);
    if (value == null) return [];
    return [
      {
        label: formatReportAxisLabel(p.x),
        value,
        value2: finitePoint(p.y2),
      },
    ];
  });
  const { ref, size } = useStableChartSize(data.length > 0);
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
    const sliceCount = data.length;
    const totalValue = data.reduce((s, d) => s + (Number(d.value) || 0), 0);
    const legendFontSize = sliceCount >= 9 ? 9 : sliceCount >= 5 ? 10 : 11;
    const labelFontSize = sliceCount >= 5 ? 9 : 10;
    const outerRadius = sliceCount >= 9 ? 64 : sliceCount >= 5 ? 70 : 80;

    const pieLabel =
      sliceCount >= 9
        ? false
        : (props: {
            name?: string;
            percent?: number;
            cx?: number;
            cy?: number;
            midAngle?: number;
            outerRadius?: number;
          }) => {
            const p = props.percent ?? 0;
            if (sliceCount >= 5 && p < 0.08) return null;
            const text =
              sliceCount <= 4
                ? `${(p * 100).toFixed(0)}%`
                : `${translateEnumValue(props.name).slice(0, 10)} ${(p * 100).toFixed(0)}%`;
            const RADIAN = Math.PI / 180;
            const radius = (props.outerRadius ?? 80) + (sliceCount <= 4 ? 14 : 18);
            const x =
              (props.cx ?? 0) + radius * Math.cos(-(props.midAngle ?? 0) * RADIAN);
            const y =
              (props.cy ?? 0) + radius * Math.sin(-(props.midAngle ?? 0) * RADIAN);
            return (
              <text
                x={x}
                y={y}
                fill={muted}
                textAnchor={x > (props.cx ?? 0) ? "start" : "end"}
                dominantBaseline="central"
                fontSize={labelFontSize}
              >
                {text}
              </text>
            );
          };

    return (
      <div ref={ref} className="h-full w-full min-w-0">
        <PieChart width={size.width} height={size.height}>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="45%"
            outerRadius={outerRadius}
            label={pieLabel}
            labelLine={sliceCount < 9}
            isAnimationActive={false}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            cursor={rechartsChartCursor}
            contentStyle={rechartsTooltipContentStyle}
            wrapperStyle={rechartsTooltipWrapperStyle}
            formatter={(value, _name, item) => {
              const num = Number(value) || 0;
              const share =
                totalValue > 0 ? ` (${((num / totalValue) * 100).toFixed(0)}%)` : "";
              const rawLabel = item?.payload?.label;
              const name =
                typeof rawLabel === "string" ? translateEnumValue(rawLabel) : series.label;
              return [`${formatChartValue(num, asMoney)}${share}`, name];
            }}
          />
          <Legend
            verticalAlign="bottom"
            wrapperStyle={{
              fontSize: legendFontSize,
              maxHeight: sliceCount >= 9 ? 72 : undefined,
              overflowY: sliceCount >= 9 ? "auto" : undefined,
              paddingTop: 4,
            }}
            formatter={(value) => translateEnumValue(String(value))}
          />
        </PieChart>
      </div>
    );
  }

  if (series.chart === "line") {
    return (
      <div ref={ref} className="h-full w-full min-w-0">
        <LineChart
          width={size.width}
          height={size.height}
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
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
          <Line
            type="monotone"
            dataKey="value"
            name="Actual"
            stroke={primary}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          {data.some((d) => d.value2 != null) ? (
            <>
              <Legend />
              <Line
                type="monotone"
                dataKey="value2"
                name="Comparación"
                stroke={secondary}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </>
          ) : null}
        </LineChart>
      </div>
    );
  }

  if (series.chart === "area") {
    const hasCompare = data.some((d) => d.value2 != null);
    return (
      <div ref={ref} className="h-full w-full min-w-0">
        <AreaChart
          width={size.width}
          height={size.height}
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id={`fill-${series.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={primary} stopOpacity={0.35} />
              <stop offset="100%" stopColor={primary} stopOpacity={0.02} />
            </linearGradient>
            {hasCompare ? (
              <linearGradient id={`fill2-${series.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={secondary} stopOpacity={0.28} />
                <stop offset="100%" stopColor={secondary} stopOpacity={0.02} />
              </linearGradient>
            ) : null}
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
          {hasCompare ? <Legend /> : null}
          <Area
            type="monotone"
            dataKey="value"
            name="Actual"
            stroke={primary}
            fill={`url(#fill-${series.id})`}
            strokeWidth={2}
            isAnimationActive={false}
          />
          {hasCompare ? (
            <Area
              type="monotone"
              dataKey="value2"
              name="Comparación"
              stroke={secondary}
              fill={`url(#fill2-${series.id})`}
              strokeWidth={2}
              isAnimationActive={false}
            />
          ) : null}
        </AreaChart>
      </div>
    );
  }

  const hasCompareBar = data.some((d) => d.value2 != null);
  return (
    <div ref={ref} className="h-full w-full min-w-0">
      <BarChart
        width={size.width}
        height={size.height}
        data={data}
        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
      >
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
        {hasCompareBar ? <Legend /> : null}
        <Bar
          dataKey="value"
          name="Actual"
          fill={primary}
          radius={[4, 4, 0, 0]}
          isAnimationActive={false}
        />
        {hasCompareBar ? (
          <Bar
            dataKey="value2"
            name="Comparación"
            fill={secondary}
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          />
        ) : null}
      </BarChart>
    </div>
  );
}

export function ReportCharts({ series }: Props) {
  const list = (Array.isArray(series) ? series : []).filter(
    (item) => item && typeof item.id === "string",
  );
  if (!list.length) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Este reporte no devolvió series para graficar.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 print:grid-cols-1">
      {list.map((s) => (
        <ChartCard key={s.id} title={s.label}>
          <SingleChart series={s} />
        </ChartCard>
      ))}
    </div>
  );
}
