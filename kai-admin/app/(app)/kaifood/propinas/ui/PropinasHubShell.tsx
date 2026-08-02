"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PropinasHubTabs, resolvePropinasTab } from "./PropinasHubTabs";
import { PropinasResumenView } from "./PropinasResumenView";
import { PropinasMovimientosView } from "./PropinasMovimientosView";
import { PropinasSaldosView } from "./PropinasSaldosView";
import { PropinasPendientesView } from "./PropinasPendientesView";
import { PropinasPagarView } from "./PropinasPagarView";
import { PropinasReportesView } from "./PropinasReportesView";

export function PropinasHubShell() {
  const searchParams = useSearchParams();
  const tab = useMemo(
    () => resolvePropinasTab(searchParams.get("tab")),
    [searchParams],
  );

  let panel = <PropinasResumenView />;
  if (tab === "movimientos") panel = <PropinasMovimientosView />;
  else if (tab === "saldos") panel = <PropinasSaldosView />;
  else if (tab === "pendientes") panel = <PropinasPendientesView />;
  else if (tab === "pagar") panel = <PropinasPagarView />;
  else if (tab === "reportes") panel = <PropinasReportesView />;

  return (
    <div className="flex flex-col gap-0" data-test-id="kaifood-propinas-hub">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 pb-3 pt-4 md:px-6">
        <PropinasHubTabs />
        <Link
          href="/kaifood/configuracion"
          className="text-sm text-muted-foreground underline"
        >
          Configuración
        </Link>
      </div>
      {panel}
    </div>
  );
}
