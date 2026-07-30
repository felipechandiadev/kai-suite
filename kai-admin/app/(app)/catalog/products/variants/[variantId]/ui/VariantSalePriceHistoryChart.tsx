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
import type { VariantSalePriceHistoryEntry } from "@/features/inventory-products/types/variant-sale-price-history.types";
import {
  rechartsChartCursor,
  rechartsTooltipContentStyle,
  rechartsTooltipWrapperStyle,
} from "@/shared/charts/recharts-tooltip";

const primary = "var(--color-primary, #002b59)";
const muted = "var(--color-muted-foreground, #7a8280)";
const border = "var(--color-border, #c1c1c2)";

const SERIES_COLORS = [primary, "#0d9488", "#ca8a04", "#9333ea", "#dc2626", "#2563eb"];

type ChartSeries = { key: string; label: string };

export type SalePriceChartAxisPoint = {
  t: number;
  label: string;
};

export type SalePriceChartPoint = {
  t: number;
  value: number;
  at: string;
  label: string;
};

export type SalePriceChartSeriesLine = ChartSeries & { points: SalePriceChartPoint[] };

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

function seriesKeyForEntry(e: VariantSalePriceHistoryEntry): string {
  return e.priceListId ? `list-${e.priceListId}` : "base";
}

function seriesLabelForEntry(e: VariantSalePriceHistoryEntry): string {
  if (e.priceListId) {
    return e.priceListName?.trim() || "Lista de precios";
  }
  return "Precio referencia";
}

/** Nombre más reciente disponible en el historial de la serie. */
function seriesLabelForEvents(events: VariantSalePriceHistoryEntry[]): string {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const name = events[i].priceListName?.trim();
    if (name) {
      return name;
    }
  }
  return seriesLabelForEntry(events[0]);
}

/** Precio colocado en la actualización (con impuestos si aplica). */
function priceAfterChange(e: VariantSalePriceHistoryEntry): number | null {
  if (e.priceListId) {
    const gross = e.newGross;
    if (gross != null && Number.isFinite(gross)) {
      return gross;
    }
    const net = e.newNet;
    if (net != null && Number.isFinite(net)) {
      return net;
    }
    return null;
  }
  const base = e.newBasePrice;
  return base != null && Number.isFinite(base) ? base : null;
}

/**
 * Un punto por actualización: solo el precio colocado (después del cambio).
 * La línea une esos precios vigentes en el tiempo.
 */
export function buildSeriesTimelinePoints(
  events: VariantSalePriceHistoryEntry[],
): SalePriceChartPoint[] {
  const points: SalePriceChartPoint[] = [];

  for (const e of events) {
    const t = new Date(e.at).getTime();
    if (!Number.isFinite(t)) {
      continue;
    }

    const placed = priceAfterChange(e);
    if (placed == null) {
      continue;
    }

    const meta = { at: e.at, label: formatShortDate(e.at) };
    const last = points[points.length - 1];
    if (last != null && last.t === t && last.value === placed) {
      continue;
    }
    points.push({ t, value: placed, ...meta });
  }

  return points;
}

export function buildSalePriceHistoryChartSeries(
  items: VariantSalePriceHistoryEntry[],
): { axisPoints: SalePriceChartAxisPoint[]; seriesLines: SalePriceChartSeriesLine[] } {
  const sorted = [...items].sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
  );

  const eventsBySeries = new Map<string, VariantSalePriceHistoryEntry[]>();
  for (const e of sorted) {
    const key = seriesKeyForEntry(e);
    const list = eventsBySeries.get(key) ?? [];
    list.push(e);
    eventsBySeries.set(key, list);
  }

  const axisByT = new Map<number, string>();
  const seriesLines: SalePriceChartSeriesLine[] = [];

  for (const [key, events] of eventsBySeries) {
    const points = buildSeriesTimelinePoints(events);
    if (points.length === 0) {
      continue;
    }
    for (const p of points) {
      axisByT.set(p.t, p.label);
    }
    seriesLines.push({
      key,
      label: seriesLabelForEvents(events),
      points,
    });
  }

  const axisPoints = [...axisByT.entries()]
    .sort(([a], [b]) => a - b)
    .map(([t, axisLabel]) => ({ t, label: axisLabel }));

  return { axisPoints, seriesLines };
}

function colorForSeries(seriesLines: SalePriceChartSeriesLine[], seriesKey: string): string {
  const idx = seriesLines.findIndex((s) => s.key === seriesKey);
  return SERIES_COLORS[(idx >= 0 ? idx : 0) % SERIES_COLORS.length];
}

type VariantSalePriceHistoryChartProps = {
  items: VariantSalePriceHistoryEntry[];
  formatMoney: (amount: number, currency: string) => string;
};

export function VariantSalePriceHistoryChart({
  items,
  formatMoney,
}: VariantSalePriceHistoryChartProps) {
  const { axisPoints, seriesLines } = useMemo(
    () => buildSalePriceHistoryChartSeries(items),
    [items],
  );

  if (seriesLines.length === 0) {
    return null;
  }

  return (
    <div
      className="fs-chart-surface mt-3 h-[min(220px,36vh)] w-full min-w-0 overflow-visible"
      data-test-id="pv-sale-price-history-chart"
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
            tickFormatter={(v) => formatMoney(Number(v), "CLP")}
            width={80}
          />
          <Tooltip
            cursor={rechartsChartCursor}
            allowEscapeViewBox={{ x: true, y: true }}
            wrapperStyle={rechartsTooltipWrapperStyle}
            contentStyle={rechartsTooltipContentStyle}
            formatter={(value, name) => {
              const n = typeof value === "number" ? value : Number(value);
              return [formatMoney(Number.isFinite(n) ? n : 0, "CLP"), String(name)];
            }}
            labelFormatter={(label, payload) => {
              const row = payload?.[0]?.payload as SalePriceChartPoint | undefined;
              if (row?.at) {
                return formatDateTime(row.at);
              }
              return typeof label === "string" ? label : String(label ?? "");
            }}
          />
          {seriesLines.length > 1 ? (
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
          ) : null}
          {seriesLines.map((line) => (
            <Line
              key={line.key}
              data={line.points}
              type="linear"
              dataKey="value"
              name={line.label}
              stroke={colorForSeries(seriesLines, line.key)}
              strokeWidth={2}
              dot={{ r: 3, fill: colorForSeries(seriesLines, line.key) }}
              activeDot={{ r: 5 }}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
