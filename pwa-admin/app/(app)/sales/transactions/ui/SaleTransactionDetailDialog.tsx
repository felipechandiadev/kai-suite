"use client";
import { LoadingState } from '@kai/ui';

import { useCallback, useEffect, useState } from "react";
import { Dialog } from "@kai/ui";
import { Alert } from "@kai/ui";
import { Badge } from "@kai/ui";
import { IconButton } from "@kai/ui";
import { getCompanyDetailsAction } from "@/features/settings-company/actions/company.action";
import { getSaleTransactionDetailAction } from "@/features/sales-transactions/actions/sale-transaction-detail.action";
import {
  canAdminReprintSaleReceipt,
  reprintAdminSaleDocument,
  reprintAdminSaleTicket,
} from "@/features/sales-transactions/print/reprint-admin-sale-transaction";
import type { SaleTransactionDetail } from "@/features/sales-transactions/types/sale-transaction-detail.types";
import {
  SALES_PAYMENT_STATUS_LABEL,
  type SalesPaymentMethod,
  type SalesPaymentStatus,
} from "@/features/sales-payments/types/sales-payment.types";
import { formatSalePaymentMethodDisplay } from "@/features/sales-transactions/lib/format-sale-payment-method";
import SalePaymentsBreakdownTable from "@/features/sales-transactions/ui/SalePaymentsBreakdownTable";
import { getTransactionTypeLabel } from "@/features/transactions/types/transaction-types";

type Props = {
  transactionId: string | null;
  open: boolean;
  onClose: () => void;
};

function formatMoney(amount: number): string {
  if (!Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
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

const CREDIT_NOTE_USAGE_LABEL: Record<
  "available" | "partially_used" | "fully_used",
  string
> = {
  available: "Disponible",
  partially_used: "Utilizada parcialmente",
  fully_used: "Utilizada",
};

function creditNoteUsageBadgeVariant(
  status: "available" | "partially_used" | "fully_used",
): "success-outlined" | "warning-outlined" | "secondary-outlined" {
  if (status === "available") return "success-outlined";
  if (status === "partially_used") return "warning-outlined";
  return "secondary-outlined";
}

export default function SaleTransactionDetailDialog({
  transactionId,
  open,
  onClose,
}: Props) {
  const [detail, setDetail] = useState<SaleTransactionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [printBusy, setPrintBusy] = useState<"ticket" | "document" | null>(null);
  const [printNotice, setPrintNotice] = useState<string | null>(null);

  const isBackorder = detail?.transactionType === "BACKORDER";
  const isSaleReturn = detail?.transactionType === "SALE_RETURN";
  const linkedNc = detail?.linkedCustomerCreditNote ?? null;
  const canPrint = detail ? canAdminReprintSaleReceipt(detail.transactionType) : false;

  const handlePrintTicket = useCallback(async () => {
    if (!detail || !canAdminReprintSaleReceipt(detail.transactionType)) return;
    setPrintBusy("ticket");
    setPrintNotice(null);
    setError(null);
    try {
      const company = await getCompanyDetailsAction();
      const res = await reprintAdminSaleTicket(detail, company);
      if (!res.success) {
        setPrintNotice(res.message ?? "No se pudo reimprimir el ticket");
      } else if (res.message) {
        setPrintNotice(res.message);
      } else {
        setPrintNotice(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo imprimir el ticket");
    } finally {
      setPrintBusy(null);
    }
  }, [detail]);

  const handlePrintDocument = useCallback(async () => {
    if (!detail || !canAdminReprintSaleReceipt(detail.transactionType)) return;
    setPrintBusy("document");
    setPrintNotice(null);
    setError(null);
    try {
      const company = await getCompanyDetailsAction();
      const res = await reprintAdminSaleDocument(detail, company);
      if (!res.success) {
        setPrintNotice(res.message ?? "No se pudo imprimir el documento");
      } else if (res.message) {
        setPrintNotice(res.message);
      } else {
        setPrintNotice(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo imprimir el documento");
    } finally {
      setPrintBusy(null);
    }
  }, [detail]);

  useEffect(() => {
    if (!open || !transactionId?.trim()) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDetail(null);
    void getSaleTransactionDetailAction(transactionId.trim()).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (res.success) {
        setDetail(res.data);
      } else {
        setError(res.error);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, transactionId]);

  const status = (detail?.status ?? "") as SalesPaymentStatus;
  const paymentMethod = (detail?.paymentMethod ?? "") as SalesPaymentMethod;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={
        detail
          ? `${getTransactionTypeLabel(detail.transactionType)} ${detail.documentNumber || ""}`.trim()
          : "Detalle de transacción"
      }
      size="xl"
      scroll="paper"
      maxHeight="min(85vh, 720px)"
      showCloseButton
      hideActions={loading || !canPrint}
      actionsJustify="end"
      alertArea={
        printNotice ? (
          <Alert variant="info" data-test-id="sale-detail-print-notice">
            {printNotice}
          </Alert>
        ) : null
      }
      actions={
        !loading && canPrint ? (
          <div className="flex items-center justify-end gap-1">
            <IconButton
              icon="ReceiptText"
              variant="action"
              size="sm"
              ariaLabel="Reimprimir ticket"
              title="Reimprimir ticket (80 mm)"
              isLoading={printBusy === "ticket"}
              disabled={printBusy != null && printBusy !== "ticket"}
              onClick={() => void handlePrintTicket()}
              data-test-id="sale-detail-print-ticket"
            />
            <IconButton
              icon="FileText"
              variant="action"
              size="sm"
              ariaLabel="Imprimir documento"
              title="Imprimir documento (hoja)"
              isLoading={printBusy === "document"}
              disabled={printBusy != null && printBusy !== "document"}
              onClick={() => void handlePrintDocument()}
              data-test-id="sale-detail-print-document"
            />
          </div>
        ) : undefined
      }
      data-test-id="sale-transaction-detail-dialog"
    >
      <div className="flex flex-col gap-4 p-4">
        {loading ? (
          <LoadingState className="flex items-center justify-center py-4" data-test-id="sale-detail-loading" />
        ) : null}

        {error ? (
          <Alert variant="error" data-test-id="sale-detail-error">
            {error}
          </Alert>
        ) : null}

        {detail && !loading ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary-outlined">{getTransactionTypeLabel(detail.transactionType)}</Badge>
              <Badge variant="info-outlined">
                {SALES_PAYMENT_STATUS_LABEL[status] ?? detail.status}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {formatDateTime(detail.createdAt)}
              </span>
            </div>

            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Cliente</dt>
                <dd className="font-medium">{detail.customerLabel ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Usuario</dt>
                <dd className="font-medium">
                  {detail.userFullName ?? detail.userUserName ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Sucursal</dt>
                <dd className="font-medium">{detail.branchName ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Punto de venta</dt>
                <dd className="font-medium">{detail.pointOfSaleName ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Medio de pago</dt>
                <dd className="font-medium">
                  {formatSalePaymentMethodDisplay(
                    detail.paymentMethod,
                    detail.payments.length,
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Referencia externa</dt>
                <dd className="font-medium">{detail.externalReference ?? "—"}</dd>
              </div>
            </dl>

            {detail.payments.length > 0 ? (
              <SalePaymentsBreakdownTable payments={detail.payments} />
            ) : null}

            {detail.notes ? (
              <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
                <span className="font-medium text-muted-foreground">Notas: </span>
                {detail.notes}
              </div>
            ) : null}

            {isSaleReturn ? (
              <section
                className="rounded-md border border-border bg-muted/20 p-3 text-sm"
                data-test-id="sale-return-credit-note-block"
              >
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Nota de crédito asociada
                </h3>
                {linkedNc ? (
                  <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
                    <div>
                      <dt className="text-muted-foreground">Folio NC</dt>
                      <dd className="font-mono font-medium">{linkedNc.documentNumber || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Estado de uso</dt>
                      <dd className="mt-0.5">
                        <Badge variant={creditNoteUsageBadgeVariant(linkedNc.usageStatus)}>
                          {CREDIT_NOTE_USAGE_LABEL[linkedNc.usageStatus]}
                        </Badge>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Monto total NC</dt>
                      <dd className="font-semibold tabular-nums">{formatMoney(linkedNc.total)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Saldo disponible</dt>
                      <dd className="font-semibold tabular-nums">
                        {formatMoney(linkedNc.availableAmount)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Monto utilizado</dt>
                      <dd className="tabular-nums">{formatMoney(linkedNc.consumedAmount)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Fecha NC</dt>
                      <dd>{formatDateTime(linkedNc.createdAt)}</dd>
                    </div>
                    {detail.saleReturnRefundMode ? (
                      <div className="sm:col-span-2">
                        <dt className="text-muted-foreground">Modo devolución</dt>
                        <dd className="font-medium">
                          {detail.saleReturnRefundMode === "immediate"
                            ? "Reembolso inmediato en caja"
                            : "Solo documento (NC)"}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                ) : (
                  <p className="text-muted-foreground" data-test-id="sale-return-no-credit-note">
                    No hay nota de crédito vinculada a esta devolución.
                  </p>
                )}
              </section>
            ) : null}

            {detail.transactionType === "BACKORDER" ? (
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-md border border-border bg-muted/20 p-3 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-muted-foreground">Abono</dt>
                  <dd className="font-semibold tabular-nums">
                    {formatMoney(detail.backorderDepositAmount ?? detail.amountPaid)}
                    {detail.backorderDepositPercent != null &&
                    detail.backorderDepositPercent > 0
                      ? ` (${detail.backorderDepositPercent}%)`
                      : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Saldo pendiente</dt>
                  <dd className="font-semibold tabular-nums">
                    {formatMoney(
                      detail.backorderPendingBalance ??
                        Math.max(0, detail.total - detail.amountPaid),
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Estado reserva</dt>
                  <dd className="font-medium">
                    {detail.backorderReservationStatus ?? "OPEN"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Total pedido</dt>
                  <dd className="font-semibold tabular-nums">{formatMoney(detail.total)}</dd>
                </div>
              </dl>
            ) : null}

            <div className="overflow-auto rounded-md border border-border">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left">
                    <th className="px-3 py-2 font-medium">Producto</th>
                    <th className="whitespace-nowrap px-3 py-2 font-medium">SKU</th>
                    <th className="whitespace-nowrap px-3 py-2 text-right font-medium">Cant.</th>
                    <th className="whitespace-nowrap px-3 py-2 text-right font-medium">
                      P. unit.
                    </th>
                    <th className="whitespace-nowrap px-3 py-2 text-right font-medium">Dto.</th>
                    <th className="whitespace-nowrap px-3 py-2 text-right font-medium">IVA</th>
                    <th className="whitespace-nowrap px-3 py-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.lines.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                        Sin líneas de detalle
                      </td>
                    </tr>
                  ) : (
                    detail.lines.map((line) => (
                      <tr key={line.id} className="border-b border-border last:border-0">
                        <td className="px-3 py-2">
                          <div className="font-medium">{line.productName}</div>
                          {line.variantName ? (
                            <div className="text-xs text-muted-foreground">{line.variantName}</div>
                          ) : null}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">
                          {line.productSku ?? "—"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                          {line.quantity}
                          {line.unitOfMeasure ? (
                            <span className="text-muted-foreground"> {line.unitOfMeasure}</span>
                          ) : null}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                          {formatMoney(line.unitPrice)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                          {formatMoney(line.discountAmount)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                          {formatMoney(line.taxAmount)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums font-medium">
                          {formatMoney(line.total)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <dl className="grid grid-cols-2 gap-2 border-t border-border pt-3 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="font-medium tabular-nums">{formatMoney(detail.subtotal)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Descuentos</dt>
                <dd className="font-medium tabular-nums">{formatMoney(detail.discountAmount)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Impuestos</dt>
                <dd className="font-medium tabular-nums">{formatMoney(detail.taxAmount)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Total</dt>
                <dd className="text-base font-semibold tabular-nums">{formatMoney(detail.total)}</dd>
              </div>
            </dl>

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span>
                {detail.transactionType === "BACKORDER" ? "Abono registrado" : "Pagado"}:{" "}
                <strong className="text-foreground tabular-nums">
                  {formatMoney(
                    detail.transactionType === "BACKORDER"
                      ? (detail.backorderDepositAmount ?? detail.amountPaid)
                      : detail.amountPaid,
                  )}
                </strong>
              </span>
              {detail.changeAmount != null && detail.changeAmount > 0 ? (
                <span>
                  Vuelto:{" "}
                  <strong className="text-foreground tabular-nums">
                    {formatMoney(detail.changeAmount)}
                  </strong>
                </span>
              ) : null}
            </div>
          </>
        ) : null}

      </div>
    </Dialog>
  );
}
