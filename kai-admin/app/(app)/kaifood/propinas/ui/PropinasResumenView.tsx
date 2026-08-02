"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Alert, TextField } from "@kai/ui";
import { getTipSummaryAction } from "@/features/kaifood-tips/actions/kaifood-tips.action";

function monthBounds(): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return {
    dateFrom: `${y}-${String(m).padStart(2, "0")}-01`,
    dateTo: `${y}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}`,
  };
}

function fmtClp(n: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
}

export function PropinasResumenView() {
  const defaults = useMemo(() => monthBounds(), []);
  const [dateFrom, setDateFrom] = useState(defaults.dateFrom);
  const [dateTo, setDateTo] = useState(defaults.dateTo);
  const [error, setError] = useState<string | null>(null);
  const [accruedTotal, setAccruedTotal] = useState(0);
  const [accruedCount, setAccruedCount] = useState(0);
  const [pending, startTransition] = useTransition();

  const load = () => {
    startTransition(() => {
      void getTipSummaryAction({ dateFrom, dateTo }).then((res) => {
        if (!res.success) {
          setError(res.message);
          return;
        }
        setError(null);
        setAccruedTotal(res.data.accruedTotal);
        setAccruedCount(res.data.accruedCount);
      });
    });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load on mount / range change
  }, [dateFrom, dateTo]);

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6" data-test-id="kaifood-propinas-resumen">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Propinas</h1>
          <p className="text-sm text-muted-foreground">
            Resumen de propinas acumuladas (no son ingreso de venta).
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href="/kaifood/propinas/movimientos" className="underline">
            Movimientos
          </Link>
          <Link href="/kaifood/propinas/reportes" className="underline">
            Reportes
          </Link>
          <Link href="/kaifood/configuracion" className="underline">
            Configuración
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <TextField
          label="Desde"
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
        />
        <TextField
          label="Hasta"
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
        />
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Pendiente (ACCRUED)
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {pending ? "…" : fmtClp(accruedTotal)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Cobros con tip
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {pending ? "…" : accruedCount}
          </p>
        </div>
      </div>
    </div>
  );
}
