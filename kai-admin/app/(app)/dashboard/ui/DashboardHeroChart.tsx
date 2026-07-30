"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AnalyticsTrendPoint } from "@/features/analytics/types/analytics.types";

type Row = { label: string; ventas: number; compras: number };

function buildChartRows(
  sales: AnalyticsTrendPoint[],
  purchases: AnalyticsTrendPoint[],
): Row[] {
  const purchaseByPeriod = new Map(purchases.map((p) => [p.period, p.total]));
  return sales.map((s) => ({
    label: s.label,
    ventas: s.total / 1_000_000,
    compras: (purchaseByPeriod.get(s.period) ?? 0) / 1_000_000,
  }));
}

function fmtMillion(n: number) {
  return `${n.toFixed(1)} M`;
}

const primary = "var(--color-primary, #002b59)";
const secondary = "var(--color-secondary, #04c9e6)";
const muted = "var(--color-muted-foreground, #7a8280)";
const border = "var(--color-border, #c1c1c2)";

type Props = {
  sales: AnalyticsTrendPoint[];
  purchases: AnalyticsTrendPoint[];
};

export function DashboardHeroChart({ sales, purchases }: Props) {
  const data = buildChartRows(sales, purchases);

  return (
    <div
      className="overflow-hidden rounded-xl border border-border bg-gradient-to-b from-background to-neutral/30 p-1 shadow-sm dark:from-background dark:to-neutral/20"
      data-test-id="dashboard-hero-chart"
    >
      <div className="rounded-[10px] border border-border/60 bg-background/80 px-4 pb-2 pt-4 backdrop-blur-sm">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-foreground">Evolución operativa</h2>
            <p className="text-sm text-muted-foreground">Ventas vs compras (últimos meses)</p>
          </div>
          <p className="text-xs text-muted-foreground">Montos en millones CLP</p>
        </div>

        <div className="fs-chart-surface h-[min(360px,55vh)] min-h-[240px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={240}>
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="fillVentas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={primary} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={primary} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="fillCompras" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={secondary} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={secondary} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={border} strokeDasharray="4 8" vertical={false} opacity={0.65} />
              <XAxis
                dataKey="label"
                tick={{ fill: muted, fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: border }}
              />
              <YAxis
                tick={{ fill: muted, fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: border }}
                tickFormatter={fmtMillion}
                width={44}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "10px",
                  border: "1px solid var(--color-border, #c1c1c2)",
                  backgroundColor: "var(--color-background, #ffffff)",
                  color: "var(--color-foreground, #131615)",
                  fontSize: "12px",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                }}
                formatter={(value, name) => {
                  const v =
                    typeof value === "number"
                      ? `${value.toFixed(1)} M CLP`
                      : value === undefined
                        ? "—"
                        : String(value);
                  return [v, name === "ventas" ? "Ventas" : "Compras"];
                }}
                labelFormatter={(label) => `Mes: ${label}`}
              />
              <Legend
                wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
                formatter={(value) => (value === "ventas" ? "Ventas" : "Compras")}
              />
              <Area
                type="monotone"
                dataKey="ventas"
                name="ventas"
                stroke={primary}
                strokeWidth={2.25}
                fill="url(#fillVentas)"
                dot={false}
                activeDot={{ r: 5, strokeWidth: 2, stroke: primary, fill: "var(--color-background,#fff)" }}
              />
              <Area
                type="monotone"
                dataKey="compras"
                name="compras"
                stroke={secondary}
                strokeWidth={2}
                fill="url(#fillCompras)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: secondary, fill: "var(--color-background,#fff)" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
