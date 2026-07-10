"use client";
import { LoadingState } from '@kai/ui';

import { useEffect, useState } from "react";
import { getCustomerPurchasesListAction } from "@/features/sales-customers/actions/customer.action";
import type { CustomerPurchaseRow } from "@/features/sales-customers/types/customer-related-documents.types";
import { fmtClp, formatCustomerDateTime, TX_TYPE_LABEL } from "./customer-detail-format";

function normalizeRow(raw: Record<string, unknown>): CustomerPurchaseRow | null {
  const id = raw.id != null ? String(raw.id) : "";
  if (!id) return null;
  return {
    id,
    documentNumber: raw.documentNumber != null ? String(raw.documentNumber) : null,
    transactionType: raw.transactionType != null ? String(raw.transactionType) : null,
    status: raw.status != null ? String(raw.status) : null,
    total: Number(raw.total) || 0,
    paymentMethod: raw.paymentMethod != null ? String(raw.paymentMethod) : null,
    createdAt: raw.createdAt != null ? String(raw.createdAt) : "",
  };
}

export function CustomerDetailPurchasesSection({ customerId }: { customerId: string }) {
  const [rows, setRows] = useState<CustomerPurchaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void getCustomerPurchasesListAction(customerId).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (res.success) {
        setRows(
          res.rows
            .map((r) => normalizeRow(r))
            .filter((x): x is CustomerPurchaseRow => x != null),
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
    return <LoadingState className="flex items-center justify-center py-4" label="Cargando compras" />;
  }
  if (error) {
    return <p className="text-sm text-error">{error}</p>;
  }
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay ventas ni encargos registrados para este cliente.
      </p>
    );
  }

  return (
    <div className="overflow-auto rounded-lg border border-border" data-test-id="customer-detail-purchases">
      <table className="w-full min-w-[560px] border-collapse text-xs">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-left text-[11px] font-semibold uppercase text-muted-foreground">
            <th className="px-3 py-2">Folio</th>
            <th className="px-3 py-2">Tipo</th>
            <th className="px-3 py-2">Estado</th>
            <th className="px-3 py-2 text-right">Total</th>
            <th className="px-3 py-2">Fecha</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const typeKey = r.transactionType ?? "";
            const typeLabel = TX_TYPE_LABEL[typeKey] ?? (typeKey || "—");
            return (
              <tr key={r.id} className="border-b border-border/80">
                <td className="px-3 py-2 font-mono text-[11px]">{r.documentNumber ?? "—"}</td>
                <td className="px-3 py-2">{typeLabel}</td>
                <td className="px-3 py-2">{r.status ?? "—"}</td>
                <td className="px-3 py-2 text-right tabular-nums font-medium">{fmtClp(r.total)}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {formatCustomerDateTime(r.createdAt)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
