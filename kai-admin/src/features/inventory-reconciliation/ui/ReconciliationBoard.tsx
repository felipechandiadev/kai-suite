"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button } from "@kai/ui";
import { retryStockFailuresAction } from "../actions";
import type { ReconciliationReport, StockEventFailure } from "../types/reconciliation.types";

const money = (n: number) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(
    Number.isFinite(n) ? n : 0,
  );
const qty = (n: number) => new Intl.NumberFormat("es-CL", { maximumFractionDigits: 3 }).format(n);

function csvCell(v: string | number | null): string {
  const s = v == null ? "" : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function StockFailuresPanel({ failures }: { failures: StockEventFailure[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  if (failures.length === 0) return null;
  const retry = async () => {
    setBusy(true);
    setMsg(null);
    const res = await retryStockFailuresAction();
    setBusy(false);
    setMsg(
      res
        ? `Reintentadas ${res.attempted}: ${res.applied} aplicadas, ${res.failed} siguen fallando.`
        : "No se pudo reintentar.",
    );
    router.refresh();
  };
  return (
    <Alert variant="warning" data-test-id="stock-failures-panel">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <strong>
            {failures.length} actualización(es) de stock fallaron y no se aplicaron
          </strong>
          <Button variant="outlined" size="sm" onClick={() => void retry()} disabled={busy} data-test-id="stock-failures-retry">
            {busy ? "Reintentando…" : "Reintentar ahora"}
          </Button>
        </div>
        <ul className="list-disc pl-5 text-xs">
          {failures.slice(0, 10).map((f) => (
            <li key={f.transactionId}>
              {f.transactionType ?? "Transacción"} {f.documentNumber ?? f.transactionId.slice(0, 8)} · {f.attempts} intento(s) · {f.lastError ?? "sin detalle"}
            </li>
          ))}
        </ul>
        {msg ? <p className="text-xs">{msg}</p> : null}
      </div>
    </Alert>
  );
}

export default function ReconciliationBoard({
  report,
  failures = [],
}: {
  report: ReconciliationReport | null;
  failures?: StockEventFailure[];
}) {
  if (!report) {
    return (
      <div className="p-4">
        <Alert variant="error">No se pudo cargar la conciliación de inventario.</Alert>
      </div>
    );
  }

  const download = () => {
    const lines = [
      ["Producto", "SKU", "Almacén", "Stock registrado", "Stock según movimientos", "Diferencia", "PMP", "Valor diferencia"].join(";"),
      ...report.mismatches.map((m) =>
        [m.productName, m.sku, m.storageName, m.recordedStock, m.expectedStock, m.difference, m.pmp, m.differenceValue]
          .map(csvCell)
          .join(";"),
      ),
    ];
    const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `conciliacion-inventario-${report.asOf.slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-3" data-test-id="inventory-reconciliation-board">
      <StockFailuresPanel failures={failures} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {report.checked} combinaciones producto/almacén revisadas · valor de inventario {money(report.totals.recordedValue)}
          {" · "}
          {report.mismatches.length === 0
            ? "sin descuadres"
            : `${report.mismatches.length} con diferencia (${money(report.totals.mismatchValue)})`}
        </p>
        <Button
          variant="outlined"
          size="sm"
          onClick={download}
          disabled={report.mismatches.length === 0}
          data-test-id="inventory-reconciliation-export"
        >
          Exportar CSV
        </Button>
      </div>
      {report.mismatches.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          El stock registrado coincide con la suma de movimientos.
        </p>
      ) : (
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="py-1.5 pr-2">Producto</th>
              <th className="py-1.5 pr-2">Almacén</th>
              <th className="py-1.5 pr-2 text-right">Registrado</th>
              <th className="py-1.5 pr-2 text-right">Según movimientos</th>
              <th className="py-1.5 pr-2 text-right">Diferencia</th>
              <th className="py-1.5 text-right">Valor</th>
            </tr>
          </thead>
          <tbody>
            {report.mismatches.map((m) => (
              <tr key={`${m.variantId}-${m.storageId}`} className="border-b border-border/70">
                <td className="py-1.5 pr-2">
                  <span className="font-medium">{m.productName ?? "—"}</span>
                  <span className="ml-2 font-mono text-[10px] text-muted-foreground">{m.sku}</span>
                </td>
                <td className="py-1.5 pr-2">{m.storageName ?? "—"}</td>
                <td className="py-1.5 pr-2 text-right tabular-nums">{qty(m.recordedStock)}</td>
                <td className="py-1.5 pr-2 text-right tabular-nums">{qty(m.expectedStock)}</td>
                <td className="py-1.5 pr-2 text-right font-medium tabular-nums text-destructive">
                  {m.difference > 0 ? "+" : ""}
                  {qty(m.difference)}
                </td>
                <td className="py-1.5 text-right tabular-nums">
                  {m.differenceValue != null ? money(m.differenceValue) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="text-xs text-muted-foreground">
        Compara el stock guardado con la suma de compras, ventas, devoluciones, ajustes y traspasos. Solo
        productos físicos e insumos. Una diferencia puede venir de stock cargado sin movimiento, ventas sin
        descuento o ediciones manuales.
      </p>
    </div>
  );
}
