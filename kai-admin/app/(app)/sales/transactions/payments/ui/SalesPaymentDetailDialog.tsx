"use client";
import { LoadingState } from '@kai/ui';

import { useCallback, useEffect, useState } from "react";
import { Dialog } from "@kai/ui";
import { Alert } from "@kai/ui";
import { Badge, type BadgeVariant } from "@kai/ui";
import { IconButton } from "@kai/ui";
import { getCompanyDetailsAction } from "@/features/settings-company/actions/company.action";
import {
  canAdminPrintPaymentIn,
  reprintAdminPaymentInDocument,
  reprintAdminPaymentInTicket,
} from "@/features/sales-payments/print/print-admin-payment-in";
import {
  SALES_PAYMENT_STATUS_LABEL,
  type SalesPaymentRow,
  type SalesPaymentStatus,
} from "@/features/sales-payments/types/sales-payment.types";
import { getSaleTransactionDetailAction } from "@/features/sales-transactions/actions/sale-transaction-detail.action";
import { formatSalePaymentMethodDisplay } from "@/features/sales-transactions/lib/format-sale-payment-method";
import type { SaleTransactionDetail } from "@/features/sales-transactions/types/sale-transaction-detail.types";
import SalePaymentsBreakdownTable from "@/features/sales-transactions/ui/SalePaymentsBreakdownTable";
import { getTransactionStatusLabel } from "@/features/transactions/types/transaction-types";

type Props = {
  payment: SalesPaymentRow | null;
  open: boolean;
  onClose: () => void;
  onOpenRelatedSale?: (saleId: string) => void;
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

function statusBadgeVariant(status: SalesPaymentStatus): BadgeVariant {
  if (status === "COMPLETED" || status === "RECEIVED") return "success-outlined";
  if (status === "VOIDED" || status === "CANCELLED") return "error-outlined";
  if (status === "PENDING" || status === "PARTIALLY_RECEIVED")
    return "warning-outlined";
  if (status === "EXPIRED") return "warning-outlined";
  return "secondary-outlined";
}

export default function SalesPaymentDetailDialog({
  payment,
  open,
  onClose,
  onOpenRelatedSale,
}: Props) {
  const [detail, setDetail] = useState<SaleTransactionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [printBusy, setPrintBusy] = useState<"ticket" | "document" | null>(null);
  const [printNotice, setPrintNotice] = useState<string | null>(null);

  const canPrint = detail ? canAdminPrintPaymentIn(detail.transactionType) : false;

  const handlePrintTicket = useCallback(async () => {
    if (!detail || !canAdminPrintPaymentIn(detail.transactionType)) return;
    setPrintBusy("ticket");
    setPrintNotice(null);
    setError(null);
    try {
      const company = await getCompanyDetailsAction();
      const res = await reprintAdminPaymentInTicket(detail, company);
      if (!res.success) {
        setPrintNotice(res.message ?? "No se pudo imprimir el ticket");
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
    if (!detail || !canAdminPrintPaymentIn(detail.transactionType)) return;
    setPrintBusy("document");
    setPrintNotice(null);
    setError(null);
    try {
      const company = await getCompanyDetailsAction();
      const res = await reprintAdminPaymentInDocument(detail, company);
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
    if (!open || !payment?.id?.trim()) {
      setDetail(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDetail(null);
    void getSaleTransactionDetailAction(payment.id.trim()).then((res) => {
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
  }, [open, payment?.id]);

  if (!payment) return null;

  const currency = payment.currency || "CLP";
  const status = (detail?.status ?? payment.status) as SalesPaymentStatus;
  const customerName =
    detail?.customerLabel?.trim() || payment.customerName?.trim() || "—";
  const customerDocument =
    detail?.customerDocument?.trim() || payment.customerDocument?.trim() || null;
  const paymentMethodDisplay = formatSalePaymentMethodDisplay(
    (detail?.paymentMethod ?? payment.paymentMethod) as SalesPaymentRow["paymentMethod"],
    detail?.payments?.length ?? payment.paymentLinesCount,
  );
  const relatedSalesFromList = payment.relatedSales ?? [];
  const allocationRows =
    detail && detail.arCollectionAllocations.length > 0
      ? detail.arCollectionAllocations.map((a) => ({
          saleId: a.saleId,
          documentNumber: a.documentNumber,
          amount: a.amount,
        }))
      : relatedSalesFromList;
  const hasMultipleSales = allocationRows.length > 1;
  const singleSale =
    allocationRows.length === 1 ? allocationRows[0] : null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Cobro ${payment.documentNumber || ""}`.trim()}
      size="lg"
      scroll="paper"
      maxHeight="min(85vh, 640px)"
      showCloseButton
      hideActions={loading || !canPrint}
      actionsJustify="end"
      alertArea={
        <>
          {error ? <Alert variant="error">{error}</Alert> : null}
          {printNotice ? (
            <Alert variant="info" data-test-id="sales-payment-detail-print-notice">
              {printNotice}
            </Alert>
          ) : null}
        </>
      }
      actions={
        !loading && canPrint ? (
          <div className="flex items-center justify-end gap-1">
            <IconButton
              icon="ReceiptText"
              variant="action"
              size="sm"
              ariaLabel="Imprimir ticket"
              title="Imprimir ticket (80 mm)"
              isLoading={printBusy === "ticket"}
              disabled={printBusy != null && printBusy !== "ticket"}
              onClick={() => void handlePrintTicket()}
              data-test-id="sales-payment-detail-print-ticket"
            />
            <IconButton
              icon="FileText"
              variant="action"
              size="sm"
              ariaLabel="Imprimir documento de cobro"
              title="Imprimir documento de cobro (hoja)"
              isLoading={printBusy === "document"}
              disabled={printBusy != null && printBusy !== "document"}
              onClick={() => void handlePrintDocument()}
              data-test-id="sales-payment-detail-print-document"
            />
          </div>
        ) : null
      }
      data-test-id="sales-payment-detail-dialog"
    >
      <div className="flex flex-col gap-4 p-4">
        {loading ? (
          <LoadingState className="flex items-center justify-center py-4" />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="text-xs uppercase text-muted-foreground">Estado</div>
                <Badge variant={statusBadgeVariant(status)} className="mt-1">
                  {SALES_PAYMENT_STATUS_LABEL[status] ??
                    getTransactionStatusLabel(status)}
                </Badge>
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground">Fecha</div>
                <div className="text-sm font-medium">
                  {formatDateTime(detail?.createdAt ?? payment.createdAt)}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground">Cliente</div>
                <div className="text-sm">{customerName}</div>
                {customerDocument ? (
                  <div className="text-xs text-muted-foreground">{customerDocument}</div>
                ) : null}
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground">Método</div>
                <div className="text-sm font-medium">{paymentMethodDisplay}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground">Sucursal</div>
                <div className="text-sm">
                  {detail?.branchName ?? payment.branchName ?? "—"}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground">
                  Punto de venta
                </div>
                <div className="text-sm">
                  {detail?.pointOfSaleName ?? payment.pointOfSaleName ?? "—"}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground">Monto cobrado</div>
                <div className="text-lg font-semibold tabular-nums">
                  {formatMoney(
                    Number(detail?.total ?? payment.total),
                    currency,
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground">Registrado pagado</div>
                <div className="text-sm font-medium tabular-nums">
                  {formatMoney(
                    Number(detail?.amountPaid ?? payment.amountPaid),
                    currency,
                  )}
                </div>
              </div>
              {!hasMultipleSales && singleSale ? (
                <div className="sm:col-span-2">
                  <div className="text-xs uppercase text-muted-foreground">
                    Venta relacionada
                  </div>
                  {onOpenRelatedSale ? (
                    <button
                      type="button"
                      className="font-mono text-sm text-primary underline-offset-2 hover:underline"
                      onClick={() => onOpenRelatedSale(singleSale.saleId)}
                      data-test-id="sales-payment-detail-related-sale"
                    >
                      {singleSale.documentNumber?.trim() || singleSale.saleId}
                    </button>
                  ) : (
                    <span className="font-mono text-sm">
                      {singleSale.documentNumber?.trim() || singleSale.saleId}
                    </span>
                  )}
                </div>
              ) : null}
              {(detail?.externalReference ?? payment.externalReference) ? (
                <div className="sm:col-span-2">
                  <div className="text-xs uppercase text-muted-foreground">
                    Referencia externa
                  </div>
                  <div className="font-mono text-sm">
                    {detail?.externalReference ?? payment.externalReference}
                  </div>
                </div>
              ) : null}
              {(detail?.notes ?? payment.notes) ? (
                <div className="sm:col-span-2">
                  <div className="text-xs uppercase text-muted-foreground">Notas</div>
                  <p className="whitespace-pre-line text-sm">
                    {detail?.notes ?? payment.notes}
                  </p>
                </div>
              ) : null}
              {detail?.userFullName || detail?.userUserName ? (
                <div className="sm:col-span-2">
                  <div className="text-xs uppercase text-muted-foreground">Usuario</div>
                  <div className="text-sm">
                    {detail?.userFullName ?? detail?.userUserName}
                    {detail?.userFullName && detail?.userUserName
                      ? ` (${detail.userUserName})`
                      : null}
                  </div>
                </div>
              ) : null}
            </div>

            {detail && detail.payments.length > 0 ? (
              <SalePaymentsBreakdownTable payments={detail.payments} />
            ) : null}

            {hasMultipleSales ? (
              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground">
                  Ventas relacionadas ({allocationRows.length})
                </div>
                <ul className="mt-2 space-y-1 text-sm">
                  {allocationRows.map((row) => (
                    <li
                      key={row.saleId}
                      className="flex justify-between gap-4 border-b border-border/60 py-1"
                    >
                      {onOpenRelatedSale ? (
                        <button
                          type="button"
                          className="font-mono text-left text-primary underline-offset-2 hover:underline"
                          onClick={() => onOpenRelatedSale(row.saleId)}
                          data-test-id={`sales-payment-detail-sale-${row.saleId}`}
                        >
                          {row.documentNumber?.trim() || row.saleId}
                        </button>
                      ) : (
                        <span className="font-mono">
                          {row.documentNumber?.trim() || row.saleId}
                        </span>
                      )}
                      <span className="tabular-nums font-medium">
                        {row.amount > 0
                          ? formatMoney(row.amount, currency)
                          : "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        )}
      </div>
    </Dialog>
  );
}
