"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Alert, TextField } from "@kai/ui";
import { getTipSummaryAction } from "@/features/kaifood-tips/actions/kaifood-tips.action";

function monthBounds() {
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

export function PropinasReportesView() {
  const defaults = useMemo(() => monthBounds(), []);
  const [dateFrom, setDateFrom] = useState(defaults.dateFrom);
  const [dateTo, setDateTo] = useState(defaults.dateTo);
  const [byDay, setByDay] = useState<
    Array<{ date: string; total: number; count: number }>
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(() => {
      void getTipSummaryAction({ dateFrom, dateTo }).then((res) => {
        if (!res.success) {
          setError(res.message);
          return;
        }
        setError(null);
        setByDay(res.data.byDay);
      });
    });
  }, [dateFrom, dateTo]);

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6" data-test-id="kaifood-propinas-reportes">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Reportes de propinas</h1>
          <p className="text-sm text-muted-foreground">
            Totales por día (fuera de reportes de ventas).{" "}
            <Link href="/kaifood/propinas" className="underline">
              ← Resumen
            </Link>
          </p>
        </div>
        <div className="flex gap-3">
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
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <th className="px-3 py-2">Día</th>
              <th className="px-3 py-2 text-right">Total</th>
              <th className="px-3 py-2 text-right">Cobros</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {byDay.map((d) => (
              <tr key={d.date}>
                <td className="px-3 py-2 tabular-nums">{d.date}</td>
                <td className="px-3 py-2 text-right tabular-nums font-medium">
                  {fmtClp(d.total)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{d.count}</td>
              </tr>
            ))}
            {!pending && byDay.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3 py-8 text-center text-muted-foreground">
                  Sin datos en el rango.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
