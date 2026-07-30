"use client";

import { useCallback, useMemo, useState } from "react";
import { DataGridTable as DataGrid } from "@kai/ui";
import type { DataGridColumn } from "@kai/ui";
import { IconButton } from "@kai/ui";
import type { SupplierInvoiceListItem } from "@/features/purchasing-invoices/types/supplier-invoice.types";
import { dteFolioDisplay } from "@/features/purchasing-dte/lib/dte-folio-display";
import { supplierDocumentPaymentStatusDisplay } from "@/features/purchasing-dte/lib/supplier-document-payment-status";
import { supplierPersonDocumentNumber } from "@/features/purchasing-dte/lib/supplier-person-document-number";
import PurchasingDteDetailDialog from "@/features/purchasing-document/ui/PurchasingDteDetailDialog";
import { CreateSupplierInvoiceDialogForm } from "./CreateSupplierInvoiceDialogForm";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatDateTimeSlash(value: string | null | undefined): string {
  if (!value?.trim()) {
    return "—";
  }
  const dt = new Date(value.trim());
  if (Number.isNaN(dt.getTime())) {
    return "—";
  }
  return `${pad2(dt.getDate())}/${pad2(dt.getMonth() + 1)}/${dt.getFullYear()} ${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`;
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

type DteInvoicesDataGridProps = {
  rows: SupplierInvoiceListItem[];
  total: number;
};

export default function DteInvoicesDataGrid({ rows, total }: DteInvoicesDataGridProps) {
  const [detailTxId, setDetailTxId] = useState<string | null>(null);

  const openDetail = useCallback((r: SupplierInvoiceListItem) => {
    setDetailTxId(r.id);
  }, []);

  const columns: DataGridColumn[] = useMemo(() => {
    function DteInvoiceActionsCell({ row }: { row: unknown; column: DataGridColumn }) {
      const r = row as SupplierInvoiceListItem;
      return (
        <div
          className="flex items-center justify-center"
          data-test-id={`dte-invoices-row-actions-${r.id}`}
        >
          <IconButton
            icon="MoreHorizontal"
            variant="action"
            size="sm"
            ariaLabel="Ver detalle de factura y recepción"
            onClick={() => openDetail(r)}
            data-test-id={`dte-invoices-row-detail-${r.id}`}
          />
        </div>
      );
    }

    return [
      {
        field: "documentNumber",
        headerName: "Folio",
        sortable: true,
        minWidth: 140,
        flex: 0.7,
        valueGetter: ({ row }) => {
          const r = row as SupplierInvoiceListItem;
          return r.documentNumber || r.id?.slice(0, 8) || "—";
        },
      },
      {
        field: "createdAt",
        headerName: "Registro",
        sortable: true,
        width: 160,
        valueGetter: ({ row }) => formatDateTimeSlash((row as SupplierInvoiceListItem).createdAt),
      },
      {
        field: "supplierName",
        headerName: "Proveedor",
        sortable: false,
        minWidth: 200,
        flex: 1.2,
        valueGetter: ({ row }) => {
          const r = row as SupplierInvoiceListItem;
          const person = r.supplier?.person;
          return (
            person?.businessName ||
            [person?.firstName, person?.lastName].filter(Boolean).join(" ") ||
            r.supplier?.id ||
            "—"
          );
        },
      },
      {
        field: "supplierRut",
        headerName: "RUT",
        sortable: false,
        width: 130,
        valueGetter: ({ row }) =>
          supplierPersonDocumentNumber((row as SupplierInvoiceListItem).supplier),
      },
      {
        field: "fiscalDocumentNumber",
        headerName: "N° documento",
        sortable: false,
        width: 140,
        valueGetter: ({ row }) => dteFolioDisplay(row as SupplierInvoiceListItem),
      },
      {
        field: "subtotal",
        headerName: "Neto",
        sortable: true,
        width: 120,
        align: "right",
        valueGetter: ({ row }) => formatMoney(Number((row as SupplierInvoiceListItem).subtotal ?? 0)),
      },
      {
        field: "total",
        headerName: "Total",
        sortable: true,
        width: 120,
        align: "right",
        valueGetter: ({ row }) => formatMoney(Number((row as SupplierInvoiceListItem).total ?? 0)),
      },
      {
        field: "paymentStatus",
        headerName: "Estado de pago",
        sortable: false,
        width: 140,
        valueGetter: ({ row }) => {
          const r = row as SupplierInvoiceListItem;
          return supplierDocumentPaymentStatusDisplay({
            paymentStatus: r.paymentStatus,
            total: r.total,
            amountPaid: r.amountPaid,
          });
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
        actionComponent: DteInvoiceActionsCell,
      },
    ];
  }, [openDetail]);

  return (
    <>
      <DataGrid
        title="Facturas"
        columns={columns}
        rows={rows}
        totalRows={total}
        totalGeneral={total}
        height="85vh"
        showExportButton={false}
        showSortButton={false}
        showFilterButton={false}
        pinActionsColumn
        createFormTitle="Ingresar factura"
        createForm={<CreateSupplierInvoiceDialogForm />}
        data-test-id="dte-invoices-data-grid"
      />
      <PurchasingDteDetailDialog
        transactionId={detailTxId}
        open={detailTxId != null}
        onClose={() => setDetailTxId(null)}
        documentLabel="Factura proveedor"
      />
    </>
  );
}
