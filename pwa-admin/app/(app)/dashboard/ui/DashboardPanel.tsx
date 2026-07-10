import { Card } from "@kai/ui";
import { StatisticsCard } from "@kai/ui";
import type { AnalyticsDashboardResponse } from "@/features/analytics/types/analytics.types";
import { DashboardHeroChart } from "./DashboardHeroChart";

function fmtMoney(n: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtCount(n: number): string {
  return new Intl.NumberFormat("es-CL").format(n);
}

function fmtChange(key: string, compare?: AnalyticsDashboardResponse["compare"]): string | undefined {
  const pct = compare?.changePct[key];
  if (pct == null) return undefined;
  const sign = pct > 0 ? "+" : "";
  return `vs período anterior ${sign}${pct}%`;
}

function MiniBars({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex h-16 items-end gap-0.5" aria-hidden>
      {values.map((v, i) => (
        <div
          key={i}
          className="min-w-[4px] flex-1 rounded-sm bg-secondary/35 transition-colors dark:bg-secondary/25"
          style={{ height: `${Math.max(8, (v / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

function formatOpValue(value: number, kind: "count" | "money"): string {
  return kind === "money" ? fmtMoney(value) : fmtCount(value);
}

type Props = {
  data: AnalyticsDashboardResponse;
};

export function DashboardPanel({ data }: Props) {
  const salesSpark = data.trends.sales.map((p) => p.total);
  const purchaseSpark = data.trends.purchases.map((p) => p.total);

  return (
    <div className="flex w-full min-w-0 flex-col gap-8" data-test-id="dashboard-panel">
      <DashboardHeroChart sales={data.trends.sales} purchases={data.trends.purchases} />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">Negocio</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatisticsCard
            label="Ventas hoy"
            value={fmtMoney(data.sales.today)}
            tone="primary"
            data-test-id="dashboard-kpi-sales-today"
          />
          <StatisticsCard
            label="Ventas netas (MTD)"
            value={fmtMoney(data.sales.mtd)}
            hint={fmtChange("salesMtd", data.compare)}
            tone="primary"
            data-test-id="dashboard-kpi-sales-net"
          />
          <StatisticsCard
            label="Ticket promedio"
            value={fmtMoney(data.sales.mtdAverageTicket)}
            hint={`${fmtCount(data.sales.mtdCount)} transacciones`}
            tone="info"
            data-test-id="dashboard-kpi-ticket"
          />
          <StatisticsCard
            label="Clientes activos"
            value={fmtCount(data.commercial.activeCustomers)}
            hint={`${fmtCount(data.commercial.newCustomersMtd)} nuevos en el período`}
            tone="success"
            data-test-id="dashboard-kpi-customers"
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">Compras e inventario</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatisticsCard
            label="Compras registradas (MTD)"
            value={fmtMoney(data.purchases.mtd)}
            hint={fmtChange("purchasesMtd", data.compare)}
            tone="primary"
          />
          <StatisticsCard
            label="Órdenes de compra abiertas"
            value={fmtCount(data.purchases.openPurchaseOrders)}
            tone="warning"
          />
          <StatisticsCard
            label="SKU bajo mínimo"
            value={fmtCount(data.inventory.thresholdAlertCount)}
            hint={`${fmtCount(data.inventory.outOfStockCount)} sin stock`}
            tone="warning"
          />
          <StatisticsCard
            label="Cotizaciones abiertas"
            value={fmtCount(data.commercial.openQuotations)}
            hint={`${fmtCount(data.commercial.activeBackorders)} backorders activos`}
            tone="info"
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">Finanzas y cobranza</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatisticsCard
            label="Cuentas por cobrar"
            value={fmtMoney(data.treasury.receivablesOutstanding)}
            hint="saldo pendiente en cuotas"
            tone="primary"
          />
          <StatisticsCard
            label="Cuotas vencidas"
            value={fmtCount(data.treasury.overdueInstallments)}
            tone="warning"
          />
          <StatisticsCard
            label="Gastos operativos (MTD)"
            value={fmtMoney(data.expenses.totalMtd)}
            hint={fmtChange("expensesTotalMtd", data.compare) ?? `${fmtCount(data.expenses.countMtd)} registros`}
            tone="info"
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">Tesorería y RRHH</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatisticsCard
            label="Sesiones de caja abiertas"
            value={fmtCount(data.treasury.openCashSessions)}
            tone="success"
          />
          <StatisticsCard
            label="Empleados activos"
            value={fmtCount(data.hr.activeEmployees)}
            tone="info"
          />
          <StatisticsCard
            label="Nómina liquidada (MTD)"
            value={fmtMoney(data.hr.payrollNetMtd)}
            hint={fmtChange("payrollNetMtd", data.compare)}
            tone="primary"
          />
          <StatisticsCard
            label="Gastos pendientes aprobación"
            value={fmtCount(data.expenses.pendingApproval)}
            tone="warning"
          />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card
          title="Tendencia ventas vs compras"
          subtitle="Serie mensual del período seleccionado"
          fillHeight
          content={
            <div className="grid gap-6">
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Ventas</p>
                <MiniBars values={salesSpark} />
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Compras</p>
                <MiniBars values={purchaseSpark} />
              </div>
            </div>
          }
          data-test-id="dashboard-chart-card"
        />

        {data.compare ? (
          <Card
            title="Comparación con período anterior"
            subtitle={`${new Date(data.compare.from).toLocaleDateString("es-CL")} – ${new Date(data.compare.to).toLocaleDateString("es-CL")}`}
            content={
              <dl className="grid gap-3">
                {(
                  [
                    ["salesMtd", "Ventas MTD"],
                    ["salesToday", "Ventas hoy"],
                    ["purchasesMtd", "Compras MTD"],
                    ["payrollNetMtd", "Nómina MTD"],
                    ["expensesTotalMtd", "Gastos MTD"],
                    ["newCustomersMtd", "Clientes nuevos"],
                  ] as const
                ).map(([key, label]) => {
                  const pct = data.compare!.changePct[key];
                  return (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  >
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="font-semibold tabular-nums text-foreground">
                      {pct == null ? "—" : `${pct > 0 ? "+" : ""}${pct}%`}
                    </dd>
                  </div>
                  );
                })}
              </dl>
            }
            data-test-id="dashboard-compare-card"
          />
        ) : null}
      </div>

      <Card
        title="Operación y cumplimiento"
        subtitle="Colas operativas en tiempo real"
        content={
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.operations.map((item) => (
              <div
                key={item.key}
                className="rounded-lg border border-border bg-background px-3 py-2"
              >
                <dt className="text-xs text-muted-foreground">{item.label}</dt>
                <dd className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                  {formatOpValue(item.value, item.kind)}
                </dd>
              </div>
            ))}
          </dl>
        }
        data-test-id="dashboard-ops-card"
      />
    </div>
  );
}
