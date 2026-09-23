import { useEffect, useState } from "react";
import { BasicPageLayout, StatisticsCard } from "@kai/ui";
import { coreFetch } from "@/lib/http";
import { toUserMessage } from "@/lib/errors";
import { formatClp } from "@/lib/format";
import type { LiteDashboard } from "@/lib/lite-api";
import { CoreError, LoadingLine } from "@/shared/components/AdminTable";
import { LiteDashboardHeroChart } from "../components/LiteDashboardHeroChart";

function fmtCount(n: number): string {
  return new Intl.NumberFormat("es-CL").format(n);
}

export function AdminHomePage() {
  const [dash, setDash] = useState<LiteDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void coreFetch<LiteDashboard>("/lite/dashboard")
      .then((r) => {
        if (!cancelled) {
          setDash(r);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(toUserMessage(e));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const salesByMonth = dash?.salesByMonth ?? [];

  return (
    <BasicPageLayout title="Resumen" data-test-id="admin-home-page">
      <LoadingLine loading={loading} />
      <CoreError message={error} />
      {!loading && !error && dash ? (
        <div className="flex w-full min-w-0 flex-col gap-8" data-test-id="lite-dashboard-panel">
          <LiteDashboardHeroChart sales={salesByMonth} />

          <section className="space-y-3">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">Negocio</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <StatisticsCard
                label="Ventas hoy"
                value={formatClp(Number(dash.salesTodayAmount ?? 0))}
                hint={`${fmtCount(Number(dash.salesTodayCount ?? dash.salesToday ?? 0))} tickets`}
                tone="primary"
                data-test-id="lite-kpi-sales-today"
              />
              <StatisticsCard
                label="Ventas del mes"
                value={formatClp(Number(dash.salesMtdAmount ?? 0))}
                hint={`${fmtCount(Number(dash.salesMtdCount ?? 0))} transacciones`}
                tone="primary"
                data-test-id="lite-kpi-sales-mtd"
              />
              <StatisticsCard
                label="Ticket promedio"
                value={formatClp(Number(dash.averageTicketMtd ?? 0))}
                hint="Promedio del mes en curso"
                tone="info"
                data-test-id="lite-kpi-ticket"
              />
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Inventario
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-2">
              <StatisticsCard
                label="SKU bajo mínimo"
                value={fmtCount(Number(dash.stockLowCount ?? 0))}
                tone="warning"
                data-test-id="lite-kpi-stock-low"
              />
              <StatisticsCard
                label="SKUs con stock"
                value={fmtCount(Number(dash.stockSkuCount ?? 0))}
                tone="info"
                data-test-id="lite-kpi-stock-skus"
              />
            </div>
          </section>
        </div>
      ) : null}
    </BasicPageLayout>
  );
}
