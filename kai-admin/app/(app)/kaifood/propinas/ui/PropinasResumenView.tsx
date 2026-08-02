"use client";

import { useEffect, useState, useTransition } from "react";
import { Alert, DotProgress } from "@kai/ui";
import { getTipSummaryAction } from "@/features/kaifood-tips/actions/kaifood-tips.action";
import { formatTipClp } from "@/features/kaifood-tips/lib/tip-labels";
import {
  defaultPropinasPeriod,
  PropinasPeriodFilter,
  type PropinasPeriodValue,
} from "./PropinasPeriodFilter";

export function PropinasResumenView() {
  const [period, setPeriod] = useState<PropinasPeriodValue>(defaultPropinasPeriod);
  const [error, setError] = useState<string | null>(null);
  const [accruedTotal, setAccruedTotal] = useState(0);
  const [accruedCount, setAccruedCount] = useState(0);
  const [overdueTotal, setOverdueTotal] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(() => {
      void getTipSummaryAction({
        dateFrom: period.dateFrom,
        dateTo: period.dateTo,
      }).then((res) => {
        if (!res.success) {
          setError(res.message);
          return;
        }
        setError(null);
        setAccruedTotal(res.data.accruedTotal);
        setAccruedCount(res.data.accruedCount);
        setOverdueTotal(res.data.overdueTotal ?? 0);
        setOverdueCount(res.data.overdueCount ?? 0);
      });
    });
  }, [period.dateFrom, period.dateTo]);

  return (
    <div
      className="flex flex-col gap-4 p-4 md:p-6"
      data-test-id="kaifood-propinas-resumen"
    >
      <div>
        <h1 className="text-xl font-semibold text-foreground">Propinas</h1>
        <p className="text-sm text-muted-foreground">
          Resumen de propinas acumuladas. No forman parte del ingreso de venta.
        </p>
      </div>

      <PropinasPeriodFilter value={period} onChange={setPeriod} />

      {error ? <Alert variant="error">{error}</Alert> : null}
      {pending ? <DotProgress aria-label="Cargando resumen" /> : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Pendiente de pago
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {formatTipClp(accruedTotal)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Cobros con propina
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{accruedCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Vencido (tarjeta)
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {formatTipClp(overdueTotal)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Cobros vencidos
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{overdueCount}</p>
        </div>
      </div>
    </div>
  );
}
