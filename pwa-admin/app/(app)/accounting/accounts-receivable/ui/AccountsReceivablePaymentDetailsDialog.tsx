"use client";

import { Dialog } from "@kai/ui";
import Badge from "@kai/ui";
import type { AccountsReceivableRow } from "@/features/accounting-accounts-receivable/types/accounts-receivable.types";
import {
  labelAccountsReceivableOriginCategory,
  labelAccountsReceivableStatus,
} from "@/features/accounting-accounts-receivable/lib/accounts-receivable-labels";

type Props = {
  open: boolean;
  row: AccountsReceivableRow | null;
  onClose: () => void;
};

function fmtClp(n: unknown): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Math.round(v));
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export default function AccountsReceivablePaymentDetailsDialog({ open, row, onClose }: Props) {
  if (!row) {
    return (
      <Dialog
        open={open}
        onClose={onClose}
        title="Detalle de cuota"
        size="md"
        hideActions
        actions={null}
      >
        <p className="text-sm text-muted-foreground">Sin datos.</p>
      </Dialog>
    );
  }

  const installmentLabel =
    !row.totalInstallments || row.totalInstallments <= 1
      ? "Cuota única"
      : `Cuota ${row.installmentNumber}/${row.totalInstallments}`;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Detalle de cuota"
      size="md"
      data-test-id="accounts-receivable-payment-details-dialog"
      hideActions
      actions={null}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="info-outlined">
            {labelAccountsReceivableOriginCategory(row.originCategory)}
          </Badge>
          <Badge
            variant={
              row.status === "PAID"
                ? "success-outlined"
                : row.isOverdue
                  ? "error-outlined"
                  : "warning-outlined"
            }
          >
            {labelAccountsReceivableStatus(row.status)}
          </Badge>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Cliente: </span>
              {row.customerName || "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Folio venta: </span>
              <span className="font-mono text-xs">{row.documentNumber || "—"}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Cuota: </span>
              {installmentLabel}
            </p>
          </div>
          <div className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Vencimiento: </span>
              {fmtDate(row.dueDate)}
              {row.isOverdue && row.status !== "PAID" ? (
                <span className="text-error"> ({row.daysOverdue} días vencida)</span>
              ) : null}
            </p>
            <p>
              <span className="text-muted-foreground">Monto cuota: </span>
              <strong>{fmtClp(row.amount)}</strong>
            </p>
            <p>
              <span className="text-muted-foreground">Pagado: </span>
              <strong>{fmtClp(row.amountPaid)}</strong>
            </p>
            <p>
              <span className="text-muted-foreground">Pendiente: </span>
              <strong>{fmtClp(row.pendingAmount)}</strong>
            </p>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
