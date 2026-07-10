"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DataGridTable as DataGrid } from "@kai/ui";
import type { DataGridColumn } from "@kai/ui";
import { dataGridFillViewportTabPageProps } from "@kai/ui";
import Badge, { type BadgeVariant } from "@kai/ui";
import { IconButton } from "@kai/ui";
import { DeleteDialog } from "@kai/ui";
import { cancelBackorderAction } from "@/features/sales-transactions/actions/cancel-backorder.action";
import { backorderRefundableAmount } from "@/features/sales-transactions/lib/backorder-refundable-amount";
import {
  SALES_PAYMENT_METHOD_LABEL,
  type SalesPaymentMethod,
} from "@/features/sales-payments/types/sales-payment.types";
import type { SalesTransactionListRow } from "@/features/sales-transactions/types/sales-transaction-list.types";
import { formatSalePaymentMethodDisplay } from "@/features/sales-transactions/lib/format-sale-payment-method";
import {
  SALE_COLLECTION_STATUS_LABEL,
  type SaleCollectionStatus,
} from "@/features/sales-transactions/lib/sale-collection-status";
import {
  BACKORDER_RESERVATION_STATUS_LABEL,
  backorderReservationStatusBadgeVariant,
  resolveBackorderReservationStatus,
} from "@/features/sales-transactions/lib/backorder-reservation-status";
import {
  CREDIT_NOTE_USAGE_LABEL,
  creditNoteUsageVariant,
} from "@/features/sales-transactions/lib/credit-note-usage-status";
import {
  formatSaleDocumentFolio,
  saleDocumentTypeBadgeVariant,
  saleDocumentTypeLabel,
} from "@/features/sales-transactions/lib/sale-document-type";
import SaleTransactionDetailDialog from "./SaleTransactionDetailDialog";

type SalesTransactionsDataGridProps = {
  rows: SalesTransactionListRow[];
  total: number;
  /** Sufijo opcional para `data-test-id` cuando hay varias grillas. */
  testIdSuffix?: string;
  /** Columnas extra para encargos (abono / total pedido). */
  variant?: "default" | "backorder";
  /** Ajustes de columnas según contexto (p.ej. devoluciones). */
  mode?: "default" | "customer-returns";
};

function formatMoney(amount: number): string {
  if (!Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(amount);
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatDateTimeSlash(value: string | null | undefined): string {
  if (!value?.trim()) return "—";
  const dt = new Date(value.trim());
  if (Number.isNaN(dt.getTime())) return "—";
  return `${pad2(dt.getDate())}/${pad2(dt.getMonth() + 1)}/${dt.getFullYear()} ${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`;
}

function collectionStatusBadgeVariant(status: SaleCollectionStatus): BadgeVariant {
  if (status === "PAID") return "success-outlined";
  if (status === "VOIDED") return "error-outlined";
  if (status === "PENDING" || status === "OVERDUE" || status === "PARTIAL")
    return "warning-outlined";
  return "secondary-outlined";
}

type RefundStatus = "REFUNDED" | "CREDIT_NOTE" | "VOIDED" | "UNKNOWN";

const REFUND_STATUS_LABEL: Record<RefundStatus, string> = {
  REFUNDED: "Reembolsado",
  CREDIT_NOTE: "Nota de crédito",
  VOIDED: "Anulado",
  UNKNOWN: "—",
};

function refundStatusBadgeVariant(status: RefundStatus): BadgeVariant {
  if (status === "REFUNDED") return "success-outlined";
  if (status === "CREDIT_NOTE") return "warning-outlined";
  if (status === "VOIDED") return "error-outlined";
  return "secondary-outlined";
}

function resolveRefundStatus(row: SalesTransactionListRow): RefundStatus {
  const raw = row.status?.trim?.().toUpperCase?.() ?? "";
  if (raw === "VOIDED" || raw === "CANCELLED") return "VOIDED";
  // Heurística:
  // - Si la devolución registra pagos => reembolso inmediato (salida de caja).
  // - Si no hay pagos => devolución en modo documento (NC).
  if ((row.paymentLinesCount ?? 0) > 0) return "REFUNDED";
  if (row.transactionType?.trim?.().toUpperCase?.() === "SALE_RETURN")
    return "CREDIT_NOTE";
  return "UNKNOWN";
}

function formatRelatedPaymentFolios(row: SalesTransactionListRow): string {
  const folios = row.relatedPaymentFolios
    .map((p) => p.documentNumber?.trim())
    .filter((f): f is string => Boolean(f) && f !== "—");
  if (folios.length === 0) return "—";
  return folios.join(", ");
}

export default function SalesTransactionsDataGrid({
  rows,
  total,
  testIdSuffix = "",
  variant = "default",
  mode = "default",
}: SalesTransactionsDataGridProps) {
  const router = useRouter();
  const [detailTxId, setDetailTxId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<SalesTransactionListRow | null>(
    null,
  );
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [isCancelPending, startCancelTransition] = useTransition();

  const openDetail = useCallback((r: SalesTransactionListRow) => {
    setDetailTxId(r.id);
  }, []);

  const openCancelDialog = useCallback((r: SalesTransactionListRow) => {
    setCancelError(null);
    setCancelTarget(r);
  }, []);

  const columns: DataGridColumn[] = useMemo(() => {
    function SalesTransactionActionsCell({ row }: { row: any; column: DataGridColumn }) {
      const r = row as SalesTransactionListRow;
      const reservationStatus = resolveBackorderReservationStatus(
        r.backorderReservationStatus,
      );
      const canCancelBackorder =
        variant === "backorder" && reservationStatus === "OPEN";

      return (
        <div
          className="flex items-center justify-center gap-0.5"
          data-test-id={`sales-transactions-row-actions-${r.id}`}
        >
          <IconButton
            icon="MoreHorizontal"
            variant="action"
            size="sm"
            ariaLabel="Ver detalle de la transacción"
            onClick={() => openDetail(r)}
            data-test-id={`sales-transactions-row-detail-${r.id}`}
          />
          {canCancelBackorder ? (
            <IconButton
              icon="Trash2"
              variant="action"
              size="sm"
              ariaLabel="Anular encargo"
              onClick={() => openCancelDialog(r)}
              data-test-id={`sales-transactions-row-cancel-backorder-${r.id}`}
            />
          ) : null}
        </div>
      );
    }

    return [
      {
        field: "documentNumber",
        headerName: "Folio",
        sortable: false,
        minWidth: 120,
        flex: 0.5,
        valueGetter: ({ row }) =>
          (row as SalesTransactionListRow).documentNumber || "—",
      },
      ...(variant === "default" && mode === "default"
        ? [
            {
              field: "documentType",
              headerName: "DTE",
              sortable: false,
              width: 110,
              valueGetter: ({ row }: { row: unknown }) =>
                saleDocumentTypeLabel(
                  (row as SalesTransactionListRow).documentType,
                ),
              renderCell: ({ row }: { row: unknown }) => {
                const r = row as SalesTransactionListRow;
                return (
                  <Badge variant={saleDocumentTypeBadgeVariant(r.documentType)}>
                    {saleDocumentTypeLabel(r.documentType)}
                  </Badge>
                );
              },
            },
            {
              field: "documentFolio",
              headerName: "Folio DTE",
              sortable: false,
              minWidth: 96,
              flex: 0.4,
              valueGetter: ({ row }: { row: unknown }) =>
                formatSaleDocumentFolio(
                  (row as SalesTransactionListRow).documentType,
                  (row as SalesTransactionListRow).documentFolio,
                ),
              renderCell: ({ row }: { row: unknown }) => {
                const r = row as SalesTransactionListRow;
                const folio = formatSaleDocumentFolio(
                  r.documentType,
                  r.documentFolio,
                );
                if (folio === "—") {
                  return <span className="text-muted-foreground">—</span>;
                }
                return <span className="font-mono text-xs">{folio}</span>;
              },
            },
          ]
        : []),
      {
        field: "createdAt",
        headerName: "Fecha",
        sortable: false,
        width: 160,
        valueGetter: ({ row }) =>
          formatDateTimeSlash((row as SalesTransactionListRow).createdAt),
      },
      ...(variant === "default" && mode === "default"
        ? [
            {
              field: "collectionStatus",
              headerName: "Estado pago",
              sortable: false,
              width: 120,
              valueGetter: ({ row }: { row: unknown }) =>
                (row as SalesTransactionListRow).collectionStatus,
              renderCell: ({ value }: { value: unknown }) => {
                const status = value as SaleCollectionStatus;
                return (
                  <Badge variant={collectionStatusBadgeVariant(status)}>
                    {SALE_COLLECTION_STATUS_LABEL[status] ?? status}
                  </Badge>
                );
              },
            },
            {
              field: "relatedPaymentFolios",
              headerName: "Folios cobro",
              sortable: false,
              minWidth: 160,
              flex: 0.85,
              cellOverflow: "wrap" as const,
              valueGetter: ({ row }: { row: unknown }) =>
                formatRelatedPaymentFolios(row as SalesTransactionListRow),
              renderCell: ({ row }: { row: unknown }) => {
                const r = row as SalesTransactionListRow;
                const folios = r.relatedPaymentFolios.filter(
                  (p) => p.documentNumber?.trim() && p.documentNumber !== "—",
                );
                if (folios.length === 0) {
                  return <span className="text-muted-foreground">—</span>;
                }
                return (
                  <span className="font-mono text-xs leading-relaxed">
                    {folios.map((p, i) => (
                      <span key={p.id || `${p.documentNumber}-${i}`}>
                        {i > 0 ? ", " : null}
                        {p.documentNumber}
                      </span>
                    ))}
                  </span>
                );
              },
            },
          ]
        : []),
      ...(variant === "default" && mode === "customer-returns"
        ? [
            {
              field: "refundStatus",
              headerName: "Estado reembolso",
              sortable: false,
              width: 140,
              valueGetter: ({ row }: { row: unknown }) =>
                resolveRefundStatus(row as SalesTransactionListRow),
              renderCell: ({ row }: { row: unknown }) => {
                const status = resolveRefundStatus(row as SalesTransactionListRow);
                return (
                  <Badge variant={refundStatusBadgeVariant(status)}>
                    {REFUND_STATUS_LABEL[status]}
                  </Badge>
                );
              },
            },
            {
              field: "linkedCreditNoteFolio",
              headerName: "Folio NC",
              sortable: false,
              minWidth: 130,
              valueGetter: ({ row }: { row: unknown }) => {
                const r = row as SalesTransactionListRow;
                return r.linkedCreditNote?.documentNumber ?? "—";
              },
              renderCell: ({ row }: { row: unknown }) => {
                const r = row as SalesTransactionListRow;
                const folio = r.linkedCreditNote?.documentNumber?.trim();
                if (!folio) {
                  return <span className="text-muted-foreground">—</span>;
                }
                return <span className="font-mono text-xs">{folio}</span>;
              },
            },
            {
              field: "linkedCreditNoteUsage",
              headerName: "Estado NC",
              sortable: false,
              width: 150,
              valueGetter: ({ row }: { row: unknown }) => {
                const nc = (row as SalesTransactionListRow).linkedCreditNote;
                if (!nc) return "—";
                return CREDIT_NOTE_USAGE_LABEL[nc.usageStatus];
              },
              renderCell: ({ row }: { row: unknown }) => {
                const nc = (row as SalesTransactionListRow).linkedCreditNote;
                if (!nc) {
                  return <span className="text-muted-foreground">—</span>;
                }
                return (
                  <Badge variant={creditNoteUsageVariant(nc.usageStatus)}>
                    {CREDIT_NOTE_USAGE_LABEL[nc.usageStatus]}
                  </Badge>
                );
              },
            },
          ]
        : []),
      {
        field: "counterpartyLabel",
        headerName: "Cliente",
        sortable: false,
        minWidth: 220,
        flex: 1,
        valueGetter: ({ row }) =>
          (row as SalesTransactionListRow).counterpartyLabel ?? "—",
      },
      {
        field: "userFullName",
        headerName: "Usuario",
        sortable: false,
        minWidth: 160,
        valueGetter: ({ row }) =>
          (row as SalesTransactionListRow).userFullName ?? "—",
      },
      {
        field: "paymentMethod",
        headerName: "Método",
        sortable: false,
        width: 140,
        valueGetter: ({ row }) => {
          const r = row as SalesTransactionListRow;
          return formatSalePaymentMethodDisplay(
            r.paymentMethod as SalesPaymentMethod,
            r.paymentLinesCount,
          );
        },
      },
      {
        field: "branchName",
        headerName: "Sucursal",
        sortable: false,
        minWidth: 140,
        valueGetter: ({ row }) =>
          (row as SalesTransactionListRow).branchName ?? "—",
      },
      {
        field: "pointOfSaleName",
        headerName: "Punto de venta",
        sortable: false,
        minWidth: 140,
        valueGetter: ({ row }) =>
          (row as SalesTransactionListRow).pointOfSaleName ?? "—",
      },
      ...(variant === "backorder"
        ? [
            {
              field: "backorderReservationStatus",
              headerName: "Estado encargo",
              sortable: false,
              width: 130,
              valueGetter: ({ row }: { row: unknown }) => {
                const r = row as SalesTransactionListRow;
                const status = resolveBackorderReservationStatus(
                  r.backorderReservationStatus,
                );
                return BACKORDER_RESERVATION_STATUS_LABEL[status];
              },
              renderCell: ({ row }: { row: unknown }) => {
                const r = row as SalesTransactionListRow;
                const status = resolveBackorderReservationStatus(
                  r.backorderReservationStatus,
                );
                return (
                  <Badge variant={backorderReservationStatusBadgeVariant(status)}>
                    {BACKORDER_RESERVATION_STATUS_LABEL[status]}
                  </Badge>
                );
              },
            },
            {
              field: "orderOrigin",
              headerName: "Origen",
              sortable: false,
              width: 88,
              valueGetter: ({ row }: { row: unknown }) => {
                const r = row as SalesTransactionListRow;
                return r.orderOrigin === "e-shop" ? "eShop" : "POS";
              },
            },
            {
              field: "backorderDepositAmount",
              headerName: "Abono",
              sortable: false,
              width: 120,
              align: "right" as const,
              valueGetter: ({ row }: { row: unknown }) => {
                const r = row as SalesTransactionListRow;
                const deposit =
                  r.backorderDepositAmount != null && r.backorderDepositAmount > 0
                    ? r.backorderDepositAmount
                    : r.amountPaid;
                const pct =
                  r.backorderPercent != null && r.backorderPercent > 0
                    ? ` (${r.backorderPercent}%)`
                    : "";
                return `${formatMoney(deposit)}${pct}`;
              },
            },
          ]
        : []),
      {
        field: "total",
        headerName: variant === "backorder" ? "Total pedido" : "Total",
        sortable: false,
        width: 130,
        align: "right",
        valueGetter: ({ row }) =>
          formatMoney(Number((row as SalesTransactionListRow).total ?? 0)),
      },
      {
        field: "actions",
        headerName: "",
        width: variant === "backorder" ? 104 : 72,
        minWidth: variant === "backorder" ? 104 : 72,
        align: "center",
        sortable: false,
        filterable: false,
        actionComponent: SalesTransactionActionsCell,
      },
    ];
  }, [openCancelDialog, openDetail, variant]);

  const cancelRefundAmount =
    cancelTarget != null ? backorderRefundableAmount(cancelTarget) : 0;

  const gridTestId =
    testIdSuffix.trim().length > 0
      ? `sales-transactions-data-grid-${testIdSuffix.trim()}`
      : "sales-transactions-data-grid";

  return (
    <>
      <DataGrid
        columns={columns}
        rows={rows}
        totalRows={total}
        totalGeneral={total}
        {...dataGridFillViewportTabPageProps}
        showExportButton={false}
        showSortButton={false}
        showFilterButton={false}
        pinActionsColumn
        data-test-id={gridTestId}
      />
      <SaleTransactionDetailDialog
        transactionId={detailTxId}
        open={detailTxId != null}
        onClose={() => setDetailTxId(null)}
      />
      {variant === "backorder" ? (
        <DeleteDialog
          open={cancelTarget != null}
          onClose={() => {
            if (!isCancelPending) {
              setCancelTarget(null);
              setCancelError(null);
            }
          }}
          title="Anular encargo"
          confirmLabel="Anular encargo"
          message={
            cancelTarget ? (
              <div className="space-y-3 text-left">
                <p className="m-0">
                  ¿Anular el encargo{" "}
                  <strong className="font-semibold">
                    «{cancelTarget.documentNumber || cancelTarget.id}»
                  </strong>
                  {cancelTarget.counterpartyLabel?.trim() ? (
                    <>
                      {" "}
                      del cliente{" "}
                      <strong className="font-semibold">
                        «{cancelTarget.counterpartyLabel.trim()}»
                      </strong>
                    </>
                  ) : null}
                  ? Esta acción no se puede deshacer.
                </p>
                <p className="m-0 text-sm text-muted-foreground">Al confirmar:</p>
                <ul className="m-0 list-disc space-y-1 pl-5 text-left text-sm text-muted-foreground">
                  <li>Se liberará el stock reservado para este pedido.</li>
                  <li>El encargo quedará en estado cancelado.</li>
                  {cancelRefundAmount >= 1 ? (
                    <li>
                      Se emitirá una nota de crédito a favor del cliente por{" "}
                      <strong className="font-semibold text-foreground">
                        {formatMoney(cancelRefundAmount)}
                      </strong>{" "}
                      (abono no utilizado del encargo).
                    </li>
                  ) : (
                    <li>
                      Este encargo no tiene abono cobrado; no se generará nota de
                      crédito.
                    </li>
                  )}
                </ul>
              </div>
            ) : null
          }
          errors={cancelError ? [cancelError] : []}
          isSubmitting={isCancelPending}
          onConfirm={() => {
            if (!cancelTarget) return;
            setCancelError(null);
            startCancelTransition(() => {
              void (async () => {
                const r = await cancelBackorderAction(cancelTarget.id);
                if (r.success) {
                  setCancelTarget(null);
                  router.refresh();
                } else {
                  setCancelError(r.error);
                }
              })();
            });
          }}
          data-test-id="backorder-cancel-dialog"
        />
      ) : null}
    </>
  );
}
