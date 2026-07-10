"use client";

import { useCallback, useMemo, useState } from "react";
import { DataGridTable as DataGrid } from "@kai/ui";
import type { DataGridColumn } from "@kai/ui";
import { dataGridFillViewportTabPageProps } from "@kai/ui";
import Badge, { type BadgeVariant } from "@kai/ui";
import { IconButton } from "@kai/ui";
import {
  SALES_PAYMENT_STATUS_LABEL,
  type SalesPaymentMethod,
  type SalesPaymentRow,
  type SalesPaymentStatus,
} from "@/features/sales-payments/types/sales-payment.types";
import { formatSalePaymentMethodDisplay } from "@/features/sales-transactions/lib/format-sale-payment-method";
import SaleTransactionDetailDialog from "../../ui/SaleTransactionDetailDialog";
import SalesPaymentDetailDialog from "./SalesPaymentDetailDialog";

type SalesPaymentsDataGridProps = {
  rows: SalesPaymentRow[];
  total: number;
};

function formatMoney(amount: number, currency: string): string {
  if (!Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: currency || "CLP",
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

function statusBadgeVariant(status: SalesPaymentStatus): BadgeVariant {
  if (status === "COMPLETED" || status === "RECEIVED") return "success-outlined";
  if (status === "VOIDED" || status === "CANCELLED") return "error-outlined";
  if (status === "PENDING" || status === "PARTIALLY_RECEIVED")
    return "warning-outlined";
  if (status === "EXPIRED") return "warning-outlined";
  return "secondary-outlined";
}

export default function SalesPaymentsDataGrid({
  rows,
  total,
}: SalesPaymentsDataGridProps) {
  const [selectedPayment, setSelectedPayment] = useState<SalesPaymentRow | null>(
    null,
  );
  const [saleDetailId, setSaleDetailId] = useState<string | null>(null);

  const openPaymentDetail = useCallback((r: SalesPaymentRow) => {
    setSelectedPayment(r);
  }, []);

  const openSaleDetail = useCallback((saleId: string | null | undefined) => {
    const id = saleId?.trim();
    if (id) setSaleDetailId(id);
  }, []);

  const columns: DataGridColumn[] = useMemo(() => {
    function SalesPaymentActionsCell({ row }: { row: any; column: DataGridColumn }) {
      const r = row as SalesPaymentRow;
      return (
        <div
          className="flex items-center justify-center"
          data-test-id={`sales-payments-row-actions-${r.id}`}
        >
          <IconButton
            icon="MoreHorizontal"
            variant="action"
            size="sm"
            ariaLabel="Ver detalle del cobro"
            onClick={() => openPaymentDetail(r)}
            data-test-id={`sales-payments-row-detail-${r.id}`}
          />
        </div>
      );
    }

    return [
      {
        field: "documentNumber",
        headerName: "Folio pago",
        sortable: false,
        minWidth: 120,
        flex: 0.6,
        valueGetter: ({ row }) =>
          (row as SalesPaymentRow).documentNumber || "—",
      },
      {
        field: "relatedSaleDocumentNumber",
        headerName: "Venta ref.",
        sortable: false,
        minWidth: 130,
        flex: 0.6,
        valueGetter: ({ row }) => {
          const r = row as SalesPaymentRow;
          return r.relatedSaleDocumentNumber?.trim() || "—";
        },
        renderCell: ({ row }) => {
          const r = row as SalesPaymentRow;
          const sales = r.relatedSales ?? [];
          if (sales.length === 0) {
            return <span className="text-muted-foreground">—</span>;
          }
          if (sales.length === 1) {
            const s = sales[0];
            const folio = s.documentNumber?.trim() || "—";
            return (
              <button
                type="button"
                className="font-mono text-sm text-primary underline-offset-2 hover:underline"
                onClick={(e) => {
                  e.stopPropagation();
                  openSaleDetail(s.saleId);
                }}
                data-test-id={`sales-payment-sale-ref-${s.saleId}`}
              >
                {folio}
              </button>
            );
          }
          return (
            <div className="flex flex-wrap gap-x-2 gap-y-0.5 py-0.5">
              {sales.map((s) => {
                const folio = s.documentNumber?.trim() || s.saleId.slice(0, 8);
                return (
                  <button
                    key={s.saleId}
                    type="button"
                    className="font-mono text-xs text-primary underline-offset-2 hover:underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      openSaleDetail(s.saleId);
                    }}
                    data-test-id={`sales-payment-sale-ref-${s.saleId}`}
                    title={s.amount > 0 ? `Monto: ${s.amount}` : undefined}
                  >
                    {folio}
                  </button>
                );
              })}
            </div>
          );
        },
      },
      {
        field: "createdAt",
        headerName: "Fecha",
        sortable: false,
        width: 160,
        valueGetter: ({ row }) =>
          formatDateTimeSlash((row as SalesPaymentRow).createdAt),
      },
      {
        field: "customerName",
        headerName: "Cliente",
        sortable: false,
        minWidth: 220,
        flex: 1,
        valueGetter: ({ row }) => {
          const r = row as SalesPaymentRow;
          if (!r.customerName) return "—";
          return r.customerDocument
            ? `${r.customerName} (${r.customerDocument})`
            : r.customerName;
        },
      },
      {
        field: "paymentMethod",
        headerName: "Método",
        sortable: false,
        width: 140,
        valueGetter: ({ row }) => {
          const r = row as SalesPaymentRow;
          return formatSalePaymentMethodDisplay(
            r.paymentMethod,
            r.paymentLinesCount,
          );
        },
      },
      {
        field: "branchName",
        headerName: "Sucursal",
        sortable: false,
        minWidth: 140,
        valueGetter: ({ row }) => (row as SalesPaymentRow).branchName ?? "—",
      },
      {
        field: "pointOfSaleName",
        headerName: "Punto de venta",
        sortable: false,
        minWidth: 140,
        valueGetter: ({ row }) =>
          (row as SalesPaymentRow).pointOfSaleName ?? "—",
      },
      {
        field: "total",
        headerName: "Total",
        sortable: false,
        width: 130,
        align: "right",
        valueGetter: ({ row }) => {
          const r = row as SalesPaymentRow;
          return formatMoney(Number(r.total ?? 0), r.currency || "CLP");
        },
      },
      {
        field: "status",
        headerName: "Estado",
        sortable: false,
        width: 130,
        valueGetter: ({ row }) => (row as SalesPaymentRow).status,
        renderCell: ({ value }) => {
          const status = value as SalesPaymentStatus;
          return (
            <Badge variant={statusBadgeVariant(status)}>
              {SALES_PAYMENT_STATUS_LABEL[status] ?? status}
            </Badge>
          );
        },
      },
      {
        field: "actions",
        headerName: "",
        width: 72,
        minWidth: 72,
        align: "center",
        sortable: false,
        filterable: false,
        actionComponent: SalesPaymentActionsCell,
      },
    ];
  }, [openPaymentDetail, openSaleDetail]);

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
        data-test-id="sales-payments-data-grid"
      />
      <SalesPaymentDetailDialog
        payment={selectedPayment}
        open={selectedPayment != null}
        onClose={() => setSelectedPayment(null)}
        onOpenRelatedSale={openSaleDetail}
      />
      <SaleTransactionDetailDialog
        transactionId={saleDetailId}
        open={saleDetailId != null}
        onClose={() => setSaleDetailId(null)}
      />
    </>
  );
}
