"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Alert, TextField } from "@kai/ui";
import { listTipLedgerAction } from "@/features/kaifood-tips/actions/kaifood-tips.action";
import type { TipLedgerEntryView } from "@/features/kaifood-tips/infrastructure/kaifood-tips.request";

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

export function PropinasMovimientosView() {
  const defaults = useMemo(() => monthBounds(), []);
  const [dateFrom, setDateFrom] = useState(defaults.dateFrom);
  const [dateTo, setDateTo] = useState(defaults.dateTo);
  const [rows, setRows] = useState<TipLedgerEntryView[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(() => {
      void listTipLedgerAction({ dateFrom, dateTo, status: "ACCRUED" }).then(
        (res) => {
          if (!res.success) {
            setError(res.message);
            return;
          }
          setError(null);
          setRows(res.data);
        },
      );
    });
  }, [dateFrom, dateTo]);

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6" data-test-id="kaifood-propinas-movimientos">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Movimientos de propinas</h1>
          <p className="text-sm text-muted-foreground">
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
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Monto</th>
              <th className="px-3 py-2">Estado tip</th>
              <th className="px-3 py-2">Medio</th>
              <th className="px-3 py-2">Venta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-3 py-2 tabular-nums">
                  {new Date(r.createdAt).toLocaleString("es-CL")}
                </td>
                <td className="px-3 py-2 tabular-nums font-medium">
                  {fmtClp(Number(r.amount) || 0)}
                </td>
                <td className="px-3 py-2">{r.tipStatus}</td>
                <td className="px-3 py-2">{r.paymentMethod ?? "—"}</td>
                <td className="px-3 py-2 font-mono text-xs">
                  {r.saleTransactionId.slice(0, 8)}…
                </td>
              </tr>
            ))}
            {!pending && rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                  Sin movimientos en el rango.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
