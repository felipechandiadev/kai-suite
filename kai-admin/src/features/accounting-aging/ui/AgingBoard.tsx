"use client";

import { Fragment, useState } from "react";
import { Alert, Button } from "@kai/ui";
import type { AgingKind, AgingReport } from "../types/aging.types";

const money = (n: number) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(
    Number.isFinite(n) ? n : 0,
  );

function csvCell(v: string | number | null): string {
  const s = v == null ? "" : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(report: AgingReport, kind: AgingKind): string {
  const party = kind === "receivable" ? "Cliente" : "Proveedor";
  const lines: string[] = [];
  lines.push([party, ...report.buckets.map((b) => b.label), "Total"].map(csvCell).join(";"));
  for (const p of report.parties) {
    lines.push(
      [p.partyName, ...report.buckets.map((b) => p[b.key]), p.total].map(csvCell).join(";"),
    );
  }
  lines.push(["TOTAL", ...report.buckets.map((b) => report.totals[b.key]), report.totals.total].map(csvCell).join(";"));
  lines.push("");
  lines.push([party, "Documento", "Cuota", "Vencimiento", "Días de atraso", "Monto", "Pagado", "Saldo"].join(";"));
  for (const p of report.parties) {
    for (const i of p.items) {
      lines.push(
        [
          p.partyName,
          i.documentNumber,
          `${i.installmentNumber}/${i.totalInstallments}`,
          i.dueDate,
          i.daysOverdue,
          i.amount,
          i.amountPaid,
          i.pendingAmount,
        ]
          .map(csvCell)
          .join(";"),
      );
    }
  }
  return "﻿" + lines.join("\n");
}

type Props = { kind: AgingKind; report: AgingReport | null };

export default function AgingBoard({ kind, report }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const partyLabel = kind === "receivable" ? "Cliente" : "Proveedor";

  if (!report) {
    return (
      <div className="p-4">
        <Alert variant="error">No se pudo cargar la antigüedad de saldos.</Alert>
      </div>
    );
  }

  const download = () => {
    const blob = new Blob([toCsv(report, kind)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `antiguedad-${kind === "receivable" ? "clientes" : "proveedores"}-${report.asOf}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-3" data-test-id={`aging-board-${kind}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Saldos pendientes al {report.asOf}, por días de atraso desde el vencimiento.
        </p>
        <Button variant="outlined" size="sm" onClick={download} data-test-id="aging-export-csv">
          Exportar CSV
        </Button>
      </div>
      {report.parties.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Sin saldos pendientes.</p>
      ) : (
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="py-1.5 pr-2">{partyLabel}</th>
              {report.buckets.map((b) => (
                <th key={b.key} className="py-1.5 pr-2 text-right">
                  {b.label}
                </th>
              ))}
              <th className="py-1.5 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {report.parties.map((p) => {
              const key = p.partyId ?? p.partyName;
              const isOpen = open === key;
              return (
                <Fragment key={key}>
                  <tr
                    className="cursor-pointer border-b border-border/70 hover:bg-muted/40"
                    onClick={() => setOpen(isOpen ? null : key)}
                    data-test-id={`aging-row-${key}`}
                  >
                    <td className="py-1.5 pr-2 font-medium">{p.partyName}</td>
                    {report.buckets.map((b) => (
                      <td
                        key={b.key}
                        className={`py-1.5 pr-2 text-right tabular-nums ${
                          b.key !== "current" && p[b.key] > 0 ? "text-destructive" : ""
                        }`}
                      >
                        {p[b.key] ? money(p[b.key]) : "—"}
                      </td>
                    ))}
                    <td className="py-1.5 text-right font-medium tabular-nums">{money(p.total)}</td>
                  </tr>
                  {isOpen
                    ? p.items.map((i) => (
                        <tr key={i.id} className="border-b border-border/40 bg-muted/20 text-xs">
                          <td className="py-1 pl-4 pr-2" colSpan={2}>
                            {i.documentNumber ?? "—"} · cuota {i.installmentNumber}/{i.totalInstallments}
                          </td>
                          <td className="py-1 pr-2" colSpan={2}>
                            Vence {i.dueDate ?? "—"}
                            {i.daysOverdue > 0 ? ` (${i.daysOverdue} días de atraso)` : ""}
                          </td>
                          <td className="py-1 pr-2 text-right tabular-nums" colSpan={2}>
                            {money(i.amount)} · pagado {money(i.amountPaid)}
                          </td>
                          <td className="py-1 text-right tabular-nums">{money(i.pendingAmount)}</td>
                        </tr>
                      ))
                    : null}
                </Fragment>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-border font-semibold">
              <td className="py-1.5 pr-2">Total</td>
              {report.buckets.map((b) => (
                <td key={b.key} className="py-1.5 pr-2 text-right tabular-nums">
                  {money(report.totals[b.key])}
                </td>
              ))}
              <td className="py-1.5 text-right tabular-nums">{money(report.totals.total)}</td>
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  );
}
