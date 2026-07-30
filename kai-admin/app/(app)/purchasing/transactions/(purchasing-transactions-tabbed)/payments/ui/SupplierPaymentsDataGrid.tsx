"use client";

import { useCallback, useMemo, useState } from "react";
import { DataGridTable as DataGrid } from "@kai/ui";
import type { DataGridColumn } from "@kai/ui";
import { dataGridFillViewportTabPageProps } from "@kai/ui";
import { Badge, type BadgeVariant } from "@kai/ui";
import { IconButton } from "@kai/ui";
import {
  SUPPLIER_PAYMENT_METHOD_LABEL,
  SUPPLIER_PAYMENT_STATUS_LABEL,
  type SupplierPaymentRow,
} from "@/features/purchasing-supplier-payments/types/supplier-payment.types";
import SupplierPaymentDetailDialog from "./SupplierPaymentDetailDialog";

type SupplierPaymentsDataGridProps = {
  rows: SupplierPaymentRow[];
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

function statusBadgeVariant(status: string): BadgeVariant {
  if (status === "CONFIRMED" || status === "COMPLETED") return "success-outlined";
  if (status === "VOIDED" || status === "CANCELLED") return "error-outlined";
  if (status === "DRAFT" || status === "PENDING") return "warning-outlined";
  return "secondary-outlined";
}

function formatPaymentMethod(method: string): string {
  const key = String(method || "").trim().toUpperCase();
  return SUPPLIER_PAYMENT_METHOD_LABEL[key] ?? (key || "—");
}

function formatInstallment(row: SupplierPaymentRow): string {
  if (
    row.installmentNumber != null &&
    row.totalInstallments != null &&
    row.totalInstallments > 1
  ) {
    return `${row.installmentNumber}/${row.totalInstallments}`;
  }
  return "—";
}

export default function SupplierPaymentsDataGrid({
  rows,
  total,
}: SupplierPaymentsDataGridProps) {
  const [selectedPayment, setSelectedPayment] =
    useState<SupplierPaymentRow | null>(null);

  const openPaymentDetail = useCallback((r: SupplierPaymentRow) => {
    setSelectedPayment(r);
  }, []);

  const columns: DataGridColumn[] = useMemo(() => {
    function SupplierPaymentActionsCell({
      row,
    }: {
      row: unknown;
      column: DataGridColumn;
    }) {
      const r = row as SupplierPaymentRow;
      return (
        <div
          className="flex items-center justify-center"
          data-test-id={`supplier-payments-row-actions-${r.id}`}
        >
          <IconButton
            icon="MoreHorizontal"
            variant="action"
            size="sm"
            ariaLabel="Ver detalle del pago"
            onClick={() => openPaymentDetail(r)}
            data-test-id={`supplier-payments-row-detail-${r.id}`}
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
          (row as SupplierPaymentRow).documentNumber || "—",
      },
      {
        field: "relatedDocumentNumber",
        headerName: "Doc. origen",
        sortable: false,
        minWidth: 130,
        flex: 0.6,
        valueGetter: ({ row }) =>
          (row as SupplierPaymentRow).relatedDocumentNumber?.trim() || "—",
      },
      {
        field: "installment",
        headerName: "Cuota",
        sortable: false,
        width: 80,
        valueGetter: ({ row }) => formatInstallment(row as SupplierPaymentRow),
      },
      {
        field: "createdAt",
        headerName: "Fecha",
        sortable: false,
        width: 160,
        valueGetter: ({ row }) =>
          formatDateTimeSlash((row as SupplierPaymentRow).createdAt),
      },
      {
        field: "supplierName",
        headerName: "Proveedor",
        sortable: false,
        minWidth: 220,
        flex: 1,
        valueGetter: ({ row }) => {
          const r = row as SupplierPaymentRow;
          if (!r.supplierName) return "—";
          return r.supplierDocument
            ? `${r.supplierName} (${r.supplierDocument})`
            : r.supplierName;
        },
      },
      {
        field: "paymentMethod",
        headerName: "Método",
        sortable: false,
        width: 140,
        valueGetter: ({ row }) =>
          formatPaymentMethod((row as SupplierPaymentRow).paymentMethod),
      },
      {
        field: "branchName",
        headerName: "Sucursal",
        sortable: false,
        minWidth: 140,
        valueGetter: ({ row }) =>
          (row as SupplierPaymentRow).branchName ?? "—",
      },
      {
        field: "total",
        headerName: "Total",
        sortable: false,
        width: 130,
        align: "right",
        valueGetter: ({ row }) => {
          const r = row as SupplierPaymentRow;
          return formatMoney(Number(r.total ?? 0), r.currency || "CLP");
        },
      },
      {
        field: "status",
        headerName: "Estado",
        sortable: false,
        width: 120,
        valueGetter: ({ row }) => (row as SupplierPaymentRow).status,
        renderCell: ({ value }) => {
          const status = String(value ?? "");
          return (
            <Badge variant={statusBadgeVariant(status)}>
              {SUPPLIER_PAYMENT_STATUS_LABEL[status] ?? status}
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
        actionComponent: SupplierPaymentActionsCell,
      },
    ];
  }, [openPaymentDetail]);

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
        data-test-id="supplier-payments-data-grid"
      />
      <SupplierPaymentDetailDialog
        payment={selectedPayment}
        open={selectedPayment != null}
        onClose={() => setSelectedPayment(null)}
      />
    </>
  );
}
