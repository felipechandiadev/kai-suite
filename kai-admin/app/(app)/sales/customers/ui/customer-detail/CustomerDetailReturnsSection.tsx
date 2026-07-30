"use client";
import { LoadingState } from '@kai/ui';

import { useEffect, useState } from "react";
import { Badge } from "@kai/ui";
import { getCustomerReturnsListAction } from "@/features/sales-customers/actions/customer.action";
import type { CustomerReturnRow } from "@/features/sales-customers/types/customer-related-documents.types";
import {
  CREDIT_NOTE_USAGE_LABEL,
  creditNoteUsageVariant,
  fmtClp,
  formatCustomerDateTime,
} from "./customer-detail-format";

function normalizeRow(raw: Record<string, unknown>): CustomerReturnRow | null {
  const id = raw.id != null ? String(raw.id) : "";
  if (!id) return null;
  const ncRaw = raw.linkedCreditNote;
  let linkedCreditNote: CustomerReturnRow["linkedCreditNote"] = null;
  if (ncRaw && typeof ncRaw === "object") {
    const nc = ncRaw as Record<string, unknown>;
    const ncId = nc.id != null ? String(nc.id) : "";
    if (ncId) {
      const usage = String(nc.usageStatus ?? "available");
      linkedCreditNote = {
        id: ncId,
        documentNumber: String(nc.documentNumber ?? ""),
        total: Number(nc.total) || 0,
        consumedAmount: Number(nc.consumedAmount) || 0,
        availableAmount: Number(nc.availableAmount) || 0,
        usageStatus:
          usage === "partially_used" || usage === "fully_used" ? usage : "available",
        createdAt: String(nc.createdAt ?? ""),
        status: String(nc.status ?? ""),
      };
    }
  }
  return {
    id,
    documentNumber: String(raw.documentNumber ?? ""),
    total: Number(raw.total) || 0,
    status: String(raw.status ?? ""),
    createdAt: String(raw.createdAt ?? ""),
    refundMode: raw.refundMode != null ? String(raw.refundMode) : null,
    linkedCreditNote,
  };
}

function refundModeLabel(mode: string | null): string {
  if (mode === "immediate") return "Reembolso inmediato";
  if (mode === "document") return "Solo documento";
  return "—";
}

export function CustomerDetailReturnsSection({ customerId }: { customerId: string }) {
  const [rows, setRows] = useState<CustomerReturnRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void getCustomerReturnsListAction(customerId).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (res.success) {
        setRows(
          res.rows
            .map((r) => normalizeRow(r))
            .filter((x): x is CustomerReturnRow => x != null),
        );
      } else {
        setError(res.error);
        setRows([]);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  if (loading) {
    return <LoadingState className="flex items-center justify-center py-4" label="Cargando devoluciones" />;
  }
  if (error) {
    return <p className="text-sm text-error">{error}</p>;
  }
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay devoluciones registradas para este cliente.
      </p>
    );
  }

  return (
    <div
      className="overflow-auto rounded-lg border border-border"
      data-test-id="customer-detail-returns"
    >
      <table className="w-full min-w-[720px] border-collapse text-xs">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-left text-[11px] font-semibold uppercase text-muted-foreground">
            <th className="px-3 py-2">Folio devolución</th>
            <th className="px-3 py-2">Modo</th>
            <th className="px-3 py-2 text-right">Total</th>
            <th className="px-3 py-2">NC asociada</th>
            <th className="px-3 py-2">Estado NC</th>
            <th className="px-3 py-2">Fecha</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border/80">
              <td className="px-3 py-2 font-mono text-[11px]">{r.documentNumber || "—"}</td>
              <td className="px-3 py-2">{refundModeLabel(r.refundMode)}</td>
              <td className="px-3 py-2 text-right tabular-nums font-medium">{fmtClp(r.total)}</td>
              <td className="px-3 py-2 font-mono text-[11px]">
                {r.linkedCreditNote?.documentNumber ?? "—"}
              </td>
              <td className="px-3 py-2">
                {r.linkedCreditNote ? (
                  <Badge variant={creditNoteUsageVariant(r.linkedCreditNote.usageStatus)}>
                    {CREDIT_NOTE_USAGE_LABEL[r.linkedCreditNote.usageStatus]}
                  </Badge>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-3 py-2 text-muted-foreground">
                {formatCustomerDateTime(r.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
