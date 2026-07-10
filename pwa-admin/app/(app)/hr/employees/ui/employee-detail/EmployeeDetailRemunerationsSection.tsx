"use client";

import { useEffect, useState } from "react";
import { LoadingState } from "@kai/ui";
import { Badge, type BadgeVariant } from "@kai/ui";
import { listRemunerationsForGridAction } from "@/features/hr-remunerations/actions/remuneration.action";
import type { RemunerationGridRow } from "@/features/hr-remunerations/types/remuneration.types";
import { getTransactionStatusLabel } from "@/features/transactions/types/transaction-types";
import { formatDateOnlySlash, formatMoneyClp } from "./employee-detail-labels";

function statusBadgeVariant(status: string): BadgeVariant {
  const s = status?.toUpperCase();
  if (s === "COMPLETED" || s === "CONFIRMED" || s === "RECEIVED") return "success-outlined";
  if (s === "DRAFT" || s === "PENDING") return "warning-outlined";
  if (s === "CANCELLED" || s === "VOIDED") return "secondary-outlined";
  return "info-outlined";
}

export function EmployeeDetailRemunerationsSection({ employeeId }: { employeeId: string }) {
  const [rows, setRows] = useState<RemunerationGridRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = employeeId.trim();
    if (!id) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void listRemunerationsForGridAction({ employeeId: id }).then((data) => {
      if (cancelled) return;
      setLoading(false);
      setRows(data);
    }).catch((e) => {
      if (cancelled) return;
      setLoading(false);
      setError(e instanceof Error ? e.message : "No se pudieron cargar las liquidaciones.");
    });
    return () => {
      cancelled = true;
    };
  }, [employeeId]);

  if (loading) {
    return <LoadingState className="flex items-center justify-center py-8" label="Cargando liquidaciones" />;
  }

  if (error) {
    return (
      <p className="text-sm text-error" role="alert" data-test-id="employee-detail-remunerations-error">
        {error}
      </p>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" data-test-id="employee-detail-remunerations-empty">
        Sin liquidaciones registradas.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto" data-test-id="employee-detail-remunerations">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="px-2 py-2 font-medium">Folio</th>
            <th className="px-2 py-2 font-medium">Fecha</th>
            <th className="px-2 py-2 font-medium text-right">Haberes</th>
            <th className="px-2 py-2 font-medium text-right">Descuentos</th>
            <th className="px-2 py-2 font-medium text-right">Líquido</th>
            <th className="px-2 py-2 font-medium">Estado</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const statusKey = String(row.status || "");
            return (
              <tr
                key={row.id}
                className="border-b border-border/60"
                data-test-id={`employee-detail-remuneration-row-${row.id}`}
              >
                <td className="px-2 py-2 tabular-nums">{row.documentNumber?.trim() || "—"}</td>
                <td className="px-2 py-2">{formatDateOnlySlash(row.date)}</td>
                <td className="px-2 py-2 text-right tabular-nums">{formatMoneyClp(row.totalEarnings)}</td>
                <td className="px-2 py-2 text-right tabular-nums">{formatMoneyClp(row.totalDeductions)}</td>
                <td className="px-2 py-2 text-right tabular-nums">{formatMoneyClp(row.netPayment)}</td>
                <td className="px-2 py-2">
                  <Badge variant={statusBadgeVariant(statusKey)}>
                    {getTransactionStatusLabel(statusKey)}
                  </Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
