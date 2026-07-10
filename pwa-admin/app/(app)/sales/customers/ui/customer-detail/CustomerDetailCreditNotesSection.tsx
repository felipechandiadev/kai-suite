"use client";
import { LoadingState } from '@kai/ui';

import { useEffect, useState } from "react";
import Badge from "@kai/ui";
import { getCustomerCreditNotesListAction } from "@/features/sales-customers/actions/customer.action";
import type {
  CustomerCreditNoteRow,
  CustomerCreditNoteUsageStatus,
} from "@/features/sales-customers/types/customer-related-documents.types";
import {
  CREDIT_NOTE_USAGE_LABEL,
  creditNoteUsageVariant,
  fmtClp,
  formatCustomerDateTime,
} from "./customer-detail-format";

function normalizeRow(raw: Record<string, unknown>): CustomerCreditNoteRow | null {
  const id = raw.id != null ? String(raw.id) : "";
  if (!id) return null;
  const usage = String(raw.usageStatus ?? "available");
  const usageStatus: CustomerCreditNoteUsageStatus =
    usage === "partially_used" || usage === "fully_used" ? usage : "available";
  return {
    id,
    documentNumber: String(raw.documentNumber ?? ""),
    total: Number(raw.total) || 0,
    consumedAmount: Number(raw.consumedAmount) || 0,
    availableAmount: Number(raw.availableAmount) || 0,
    usageStatus,
    createdAt: String(raw.createdAt ?? ""),
    status: String(raw.status ?? ""),
  };
}

export function CustomerDetailCreditNotesSection({ customerId }: { customerId: string }) {
  const [rows, setRows] = useState<CustomerCreditNoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void getCustomerCreditNotesListAction(customerId).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (res.success) {
        setRows(
          res.rows
            .map((r) => normalizeRow(r))
            .filter((x): x is CustomerCreditNoteRow => x != null),
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
    return <LoadingState className="flex items-center justify-center py-4" label="Cargando notas de crédito" />;
  }
  if (error) {
    return <p className="text-sm text-error">{error}</p>;
  }
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay notas de crédito registradas para este cliente.
      </p>
    );
  }

  return (
    <div
      className="overflow-auto rounded-lg border border-border"
      data-test-id="customer-detail-credit-notes"
    >
      <table className="w-full min-w-[640px] border-collapse text-xs">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-left text-[11px] font-semibold uppercase text-muted-foreground">
            <th className="px-3 py-2">Folio NC</th>
            <th className="px-3 py-2">Estado de uso</th>
            <th className="px-3 py-2 text-right">Total</th>
            <th className="px-3 py-2 text-right">Utilizado</th>
            <th className="px-3 py-2 text-right">Disponible</th>
            <th className="px-3 py-2">Fecha</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border/80">
              <td className="px-3 py-2 font-mono text-[11px]">{r.documentNumber || "—"}</td>
              <td className="px-3 py-2">
                <Badge variant={creditNoteUsageVariant(r.usageStatus)}>
                  {CREDIT_NOTE_USAGE_LABEL[r.usageStatus]}
                </Badge>
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{fmtClp(r.total)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{fmtClp(r.consumedAmount)}</td>
              <td className="px-3 py-2 text-right tabular-nums font-medium">
                {fmtClp(r.availableAmount)}
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
