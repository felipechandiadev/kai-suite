"use client";
import { LoadingState } from '@kai/ui';

import { useEffect, useState } from "react";
import { getCustomerPendingQuotasListAction } from "@/features/sales-customers/actions/customer.action";

function fmtClp(n: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
}

export function CustomerDetailQuotasSection({ customerId }: { customerId: string }) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void getCustomerPendingQuotasListAction(customerId).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (res.success) {
        setRows(res.rows);
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
    return <LoadingState className="flex items-center justify-center py-4" label="Cargando cuotas" />;
  }
  if (error) {
    return <p className="text-sm text-error">{error}</p>;
  }
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay cuotas pendientes.</p>;
  }

  return (
    <div className="overflow-auto rounded-lg border border-border" data-test-id="customer-detail-quotas">
      <table className="w-full min-w-[480px] border-collapse text-xs">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-left text-[11px] font-semibold uppercase text-muted-foreground">
            <th className="px-3 py-2">Documento</th>
            <th className="px-3 py-2 text-right">Monto</th>
            <th className="px-3 py-2">Vencimiento</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const id = String(r.id ?? i);
            const doc = r.documentNumber != null ? String(r.documentNumber) : "—";
            const amount = Number(r.amount) || 0;
            const due = r.dueDate != null ? String(r.dueDate) : "—";
            return (
              <tr key={`quota-${id}`} className="border-b border-border/80">
                <td className="px-3 py-2 font-mono text-[11px]">{doc}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmtClp(amount)}</td>
                <td className="px-3 py-2 text-muted-foreground">{due}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
