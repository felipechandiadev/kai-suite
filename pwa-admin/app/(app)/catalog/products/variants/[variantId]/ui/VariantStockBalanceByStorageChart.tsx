"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  StockBalanceChartMeta,
  StockBalanceChartSeriesLine,
} from "@/features/inventory-stock/lib/variant-stock-balance-chart";
import {
  rechartsChartCursor,
  rechartsTooltipContentStyle,
  rechartsTooltipWrapperStyle,
} from "@/shared/charts/recharts-tooltip";

const primary = "var(--color-primary, #002b59)";
const muted = "var(--color-muted-foreground, #7a8280)";
const border = "var(--color-border, #c1c1c2)";

const SERIES_COLORS = [primary, "#0d9488", "#ca8a04", "#9333ea", "#dc2626", "#2563eb"];

function formatShortDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-CL", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-CL", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatQty(value: number): string {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return "0";
  }
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function colorForSeries(seriesLines: StockBalanceChartSeriesLine[], seriesKey: string): string {
  const idx = seriesLines.findIndex((s) => s.key === seriesKey);
  return SERIES_COLORS[(idx >= 0 ? idx : 0) % SERIES_COLORS.length];
}

type Props = {
  seriesLines: StockBalanceChartSeriesLine[];
  meta: StockBalanceChartMeta | null;
  unitLabel?: string | null;
};

export function VariantStockBalanceByStorageChart({ seriesLines, meta, unitLabel }: Props) {
  const axisPoints = useMemo(() => {
    const byT = new Map<number, string>();
    for (const line of seriesLines) {
      for (const p of line.points) {
        byT.set(p.t, p.label);
      }
    }
    return [...byT.entries()]
      .sort(([a], [b]) => a - b)
      .map(([t, label]) => ({ t, label }));
  }, [seriesLines]);

  if (seriesLines.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" data-test-id="pv-stock-chart-empty">
        Sin movimientos de stock registrados para graficar el saldo.
      </p>
    );
  }

  const suffix = unitLabel?.trim() ? ` ${unitLabel.trim()}` : "";

  return (
    <div className="space-y-2">
      {meta ? (
        <p className="text-xs text-muted-foreground" data-test-id="pv-stock-chart-meta">
          {formatShortDate(meta.from)} – {formatShortDate(meta.to)} · Agrupación {meta.bucketLabel}
          {meta.movementsTotal > meta.movementsUsed
            ? ` · ${meta.movementsUsed} de ${meta.movementsTotal} movimientos más recientes`
            : meta.movementsUsed > 0
              ? ` · ${meta.movementsUsed} movimientos`
              : null}
        </p>
      ) : null}
      <div
        className="fs-chart-surface h-[min(260px,40vh)] w-full min-w-0 overflow-visible"
        data-test-id="pv-stock-balance-chart"
        onMouseDown={(e) => e.preventDefault()}
      >
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={120}>
          <LineChart data={axisPoints} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
            <CartesianGrid stroke={border} strokeDasharray="4 8" vertical={false} opacity={0.65} />
            <XAxis
              type="number"
              dataKey="t"
              domain={["dataMin", "dataMax"]}
              tick={{ fill: muted, fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: border }}
              tickFormatter={(t) => formatShortDate(new Date(Number(t)).toISOString())}
            />
            <YAxis
              tick={{ fill: muted, fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: border }}
              tickFormatter={(v) => formatQty(Number(v))}
              width={56}
            />
            <Tooltip
              cursor={rechartsChartCursor}
              allowEscapeViewBox={{ x: true, y: true }}
              wrapperStyle={rechartsTooltipWrapperStyle}
              contentStyle={rechartsTooltipContentStyle}
              formatter={(value, name) => {
                const n = typeof value === "number" ? value : Number(value);
                return [`${formatQty(Number.isFinite(n) ? n : 0)}${suffix}`, String(name)];
              }}
              labelFormatter={(_label, payload) => {
                const row = payload?.[0]?.payload as { at?: string } | undefined;
                if (row?.at) {
                  return formatDateTime(row.at);
                }
                return "";
              }}
            />
            {seriesLines.length > 1 ? (
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            ) : null}
            {seriesLines.map((line) => (
              <Line
                key={line.key}
                data={line.points}
                type="stepAfter"
                dataKey="value"
                name={line.label}
                stroke={colorForSeries(seriesLines, line.key)}
                strokeWidth={2}
                dot={{ r: 2, fill: colorForSeries(seriesLines, line.key) }}
                activeDot={{ r: 4 }}
                connectNulls
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
