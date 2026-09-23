import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Point = { period: string; label: string; total: number };

type Row = { label: string; ventas: number };

function buildRows(sales: Point[]): Row[] {
  return sales.map((s) => ({
    label: s.label,
    ventas: s.total / 1_000_000,
  }));
}

function fmtMillion(n: number) {
  return `${n.toFixed(1)} M`;
}

const primary = "var(--color-primary, #002b59)";
const muted = "var(--color-muted-foreground, #7a8280)";
const border = "var(--color-border, #c1c1c2)";

type Props = {
  sales: Point[];
};

/** Gráfico hero estilo Suite: ventas mensuales en millones CLP (últimos 12 meses). */
export function LiteDashboardHeroChart({ sales }: Props) {
  const data = buildRows(sales);

  return (
    <div
      className="overflow-hidden rounded-xl border border-border bg-gradient-to-b from-background to-neutral/30 p-1 shadow-sm"
      data-test-id="lite-dashboard-hero-chart"
    >
      <div className="rounded-[10px] border border-border/60 bg-background/80 px-4 pb-2 pt-4 backdrop-blur-sm">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              Evolución de ventas
            </h2>
            <p className="text-sm text-muted-foreground">Últimos 12 meses</p>
          </div>
          <p className="text-xs text-muted-foreground">Montos en millones CLP</p>
        </div>

        <div className="fs-chart-surface h-[min(360px,55vh)] min-h-[240px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={240}>
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="liteFillVentas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={primary} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={primary} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke={border}
                strokeDasharray="4 8"
                vertical={false}
                opacity={0.65}
              />
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
                formatter={(value) => {
                  const v =
                    typeof value === "number"
                      ? `${value.toFixed(1)} M CLP`
                      : value === undefined
                        ? "—"
                        : String(value);
                  return [v, "Ventas"];
                }}
                labelFormatter={(label) => `Mes: ${label}`}
              />
              <Area
                type="monotone"
                dataKey="ventas"
                name="ventas"
                stroke={primary}
                strokeWidth={2.25}
                fill="url(#liteFillVentas)"
                dot={false}
                activeDot={{
                  r: 5,
                  strokeWidth: 2,
                  stroke: primary,
                  fill: "var(--color-background,#fff)",
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
