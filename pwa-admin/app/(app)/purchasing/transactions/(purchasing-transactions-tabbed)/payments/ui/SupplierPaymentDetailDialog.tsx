"use client";

import type { ReactNode } from "react";
import { Dialog } from "@kai/ui";
import { Badge, type BadgeVariant } from "@kai/ui";
import {
  SUPPLIER_PAYMENT_METHOD_LABEL,
  SUPPLIER_PAYMENT_STATUS_LABEL,
  type SupplierPaymentRow,
} from "@/features/purchasing-supplier-payments/types/supplier-payment.types";
import { getTransactionTypeLabel } from "@/features/transactions/types/transaction-types";

type Props = {
  payment: SupplierPaymentRow | null;
  open: boolean;
  onClose: () => void;
};

function formatMoney(amount: number, currency = "CLP"): string {
  if (!Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso?.trim()) return "—";
  const d = new Date(iso.trim());
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-CL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusBadgeVariant(status: string): BadgeVariant {
  if (status === "CONFIRMED" || status === "COMPLETED") return "success-outlined";
  if (status === "VOIDED" || status === "CANCELLED") return "error-outlined";
  if (status === "DRAFT" || status === "PENDING") return "warning-outlined";
  return "secondary-outlined";
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2 border-b border-border/60 py-2 text-sm last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 wrap-break-word">{children}</dd>
    </div>
  );
}

export default function SupplierPaymentDetailDialog({
  payment,
  open,
  onClose,
}: Props) {
  if (!payment) return null;

  const methodKey = String(payment.paymentMethod || "").trim().toUpperCase();
  const methodLabel =
    SUPPLIER_PAYMENT_METHOD_LABEL[methodKey] ?? (methodKey || "—");
  const status = String(payment.status || "");
  const installment =
    payment.installmentNumber != null &&
    payment.totalInstallments != null &&
    payment.totalInstallments > 1
      ? `${payment.installmentNumber} de ${payment.totalInstallments}`
      : null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Pago ${payment.documentNumber || ""}`.trim()}
      size="md"
      data-test-id="supplier-payment-detail-dialog"
    >
      <dl className="mt-2" data-test-id="supplier-payment-detail-body">
        <Row label="Estado">
          <Badge variant={statusBadgeVariant(status)}>
            {SUPPLIER_PAYMENT_STATUS_LABEL[status] ?? status}
          </Badge>
        </Row>
        <Row label="Fecha">{formatDateTime(payment.createdAt)}</Row>
        <Row label="Proveedor">
          {payment.supplierName
            ? payment.supplierDocument
              ? `${payment.supplierName} (${payment.supplierDocument})`
              : payment.supplierName
            : "—"}
        </Row>
        <Row label="Doc. origen">
          {payment.relatedDocumentNumber?.trim() || "—"}
          {payment.relatedDocumentType
            ? ` · ${getTransactionTypeLabel(payment.relatedDocumentType)}`
            : null}
        </Row>
        {installment ? <Row label="Cuota">{installment}</Row> : null}
        <Row label="Método">{methodLabel}</Row>
        <Row label="Sucursal">{payment.branchName ?? "—"}</Row>
        <Row label="Total">
          {formatMoney(payment.total, payment.currency || "CLP")}
        </Row>
        <Row label="Monto pagado">
          {formatMoney(payment.amountPaid, payment.currency || "CLP")}
        </Row>
        {payment.notes ? <Row label="Notas">{payment.notes}</Row> : null}
      </dl>
    </Dialog>
  );
}
