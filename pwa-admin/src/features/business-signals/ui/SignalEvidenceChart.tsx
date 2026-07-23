"use client";

import {
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
import type { SignalEvidenceDto } from "../types/signal.types";

const primary = "var(--color-primary, #002b59)";
const secondary = "var(--color-secondary, #04c9e6)";
const muted = "var(--color-muted-foreground, #7a8280)";
const border = "var(--color-border, #c1c1c2)";
const highlight = "var(--color-warning, #ca8a04)";
const PIE_COLORS = [primary, secondary, "#0d9488", "#ca8a04", "#dc2626", "#7c3aed", "#ea580c"];

function fmtClp(n: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

function fmtNum(n: number): string {
  return new Intl.NumberFormat("es-CL", { maximumFractionDigits: 2 }).format(n);
}

function shortDate(x: string): string {
  const m = x.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return x;
  return `${m[3]}/${m[2]}`;
}

type Props = {
  evidence: SignalEvidenceDto;
};

export function SignalEvidenceChart({ evidence }: Props) {
  if (evidence.kind === "timeseries" && evidence.series) {
    const thresholds = evidence.series.thresholdLines ?? [];
    const data = evidence.series.points.map((p) => {
      const row: Record<string, string | number | boolean> = {
        label: shortDate(p.x),
        value: p.y,
        highlight: Boolean(p.highlight),
      };
      thresholds.forEach((t, i) => {
        row[`t${i}`] = t.y;
      });
      return row;
    });
    return (
      <div className="h-[260px] w-full min-w-0" data-test-id="signal-evidence-chart-timeseries">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={border} strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fill: muted, fontSize: 11 }} />
            <YAxis
              width={72}
              tick={{ fill: muted, fontSize: 11 }}
              tickFormatter={(v) => fmtClp(Number(v))}
            />
            <Tooltip
              cursor={rechartsChartCursor}
              contentStyle={rechartsTooltipContentStyle}
              wrapperStyle={rechartsTooltipWrapperStyle}
              formatter={(value) => [
                fmtClp(Number(value) || 0),
                evidence.series?.label ?? "Valor",
              ]}
            />
            <Line
              type="monotone"
              dataKey="value"
              name={evidence.series.label}
              stroke={primary}
              strokeWidth={2}
              dot={(props: { cx?: number; cy?: number; payload?: { highlight?: boolean } }) => {
                const { cx, cy, payload } = props;
                if (cx == null || cy == null) return <g />;
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={payload?.highlight ? 4 : 2.5}
                    fill={payload?.highlight ? highlight : primary}
                    stroke="none"
                  />
                );
              }}
            />
            {thresholds.map((t, i) => (
              <Line
                key={`${t.label}-${i}`}
                type="monotone"
                dataKey={`t${i}`}
                name={t.label}
                stroke={i === 0 ? secondary : muted}
                strokeDasharray="4 4"
                strokeWidth={1.5}
                dot={false}
                legendType="line"
              />
            ))}
            {thresholds.length > 0 ? <Legend wrapperStyle={{ fontSize: 11 }} /> : null}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (evidence.kind === "comparison" && evidence.comparison) {
    const data = evidence.comparison.bars.map((b) => ({
      label: b.label,
      value: b.value,
    }));
    return (
      <div className="h-[240px] w-full min-w-0" data-test-id="signal-evidence-chart-comparison">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={border} strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fill: muted, fontSize: 11 }} />
            <YAxis
              width={48}
              tick={{ fill: muted, fontSize: 11 }}
              tickFormatter={(v) => `${fmtNum(Number(v))}%`}
            />
            <Tooltip
              cursor={rechartsChartCursor}
              contentStyle={rechartsTooltipContentStyle}
              wrapperStyle={rechartsTooltipWrapperStyle}
              formatter={(value) => [`${fmtNum(Number(value) || 0)}%`, "Tasa"]}
            />
            <Bar dataKey="value" fill={primary} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (evidence.kind === "breakdown" && evidence.breakdown) {
    const data = evidence.breakdown.slices.map((s) => ({
      name: s.label,
      value: s.value,
    }));
    if (data.length === 0) {
      return (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Sin comisiones estimadas para graficar.
        </p>
      );
    }
    return (
      <div className="h-[260px] w-full min-w-0" data-test-id="signal-evidence-chart-breakdown">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={90}
              label={({ name, percent }) =>
                `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
              }
            >
              {data.map((_, i) => (
                <Cell key={data[i]!.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              cursor={rechartsChartCursor}
              contentStyle={rechartsTooltipContentStyle}
              wrapperStyle={rechartsTooltipWrapperStyle}
              formatter={(value) => [fmtClp(Number(value) || 0), "Comisión"]}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (evidence.kind === "ranking" && evidence.ranking) {
    const rows = evidence.ranking.rows.slice(0, 10);
    const data = rows.map((r) => ({
      label: r.label.length > 28 ? `${r.label.slice(0, 26)}…` : r.label,
      value: r.value,
      full: r.label,
      valueLabel: r.valueLabel,
    }));
    if (data.length === 0) {
      return (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Sin filas para mostrar.
        </p>
      );
    }
    const asMoney = evidence.signalId === "dead-stock-capital";
    return (
      <div className="h-[280px] w-full min-w-0" data-test-id="signal-evidence-chart-ranking">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={220}>
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
          >
            <CartesianGrid stroke={border} strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: muted, fontSize: 11 }}
              tickFormatter={(v) => (asMoney ? fmtClp(Number(v)) : fmtNum(Number(v)))}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={120}
              tick={{ fill: muted, fontSize: 10 }}
            />
            <Tooltip
              cursor={rechartsChartCursor}
              contentStyle={rechartsTooltipContentStyle}
              wrapperStyle={rechartsTooltipWrapperStyle}
              formatter={(value, _name, item) => {
                const payload = (
                  item as { payload?: { valueLabel?: string; full?: string } }
                )?.payload;
                return [
                  payload?.valueLabel ??
                    (asMoney ? fmtClp(Number(value) || 0) : fmtNum(Number(value) || 0)),
                  payload?.full ?? "Valor",
                ];
              }}
            />
            <Bar dataKey="value" fill={primary} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <p className="py-8 text-center text-sm text-muted-foreground">
      Sin datos de gráfico para esta señal.
    </p>
  );
}
