"use client";

import { useCallback, useMemo, useState } from "react";
import { DataGridTable as DataGrid } from "@kai/ui";
import type { DataGridColumn } from "@kai/ui";
import { IconButton } from "@kai/ui";
import type { SupplierReceiptListItem } from "@/features/purchasing-supplier-receipts/types/supplier-receipt.types";
import { dteFolioDisplay } from "@/features/purchasing-dte/lib/dte-folio-display";
import PurchasingDteDetailDialog from "@/features/purchasing-document/ui/PurchasingDteDetailDialog";
import { CreateSupplierReceiptDialogForm } from "./CreateSupplierReceiptDialogForm";

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

type DteReceiptsDataGridProps = {
  rows: SupplierReceiptListItem[];
  total: number;
};

export default function DteReceiptsDataGrid({ rows, total }: DteReceiptsDataGridProps) {
  const [detailTxId, setDetailTxId] = useState<string | null>(null);

  const openDetail = useCallback((r: SupplierReceiptListItem) => {
    setDetailTxId(r.id);
  }, []);

  const columns: DataGridColumn[] = useMemo(() => {
    function DteReceiptActionsCell({ row }: { row: unknown; column: DataGridColumn }) {
      const r = row as SupplierReceiptListItem;
      return (
        <div
          className="flex items-center justify-center"
          data-test-id={`dte-receipts-row-actions-${r.id}`}
        >
          <IconButton
            icon="MoreHorizontal"
            variant="action"
            size="sm"
            ariaLabel="Ver detalle de boleta y recepción"
            onClick={() => openDetail(r)}
            data-test-id={`dte-receipts-row-detail-${r.id}`}
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
          const r = row as SupplierReceiptListItem;
          return r.documentNumber || r.id?.slice(0, 8) || "—";
        },
      },
      {
        field: "createdAt",
        headerName: "Registro",
        sortable: true,
        width: 160,
        valueGetter: ({ row }) => formatDateTimeSlash((row as SupplierReceiptListItem).createdAt),
      },
      {
        field: "supplierName",
        headerName: "Proveedor",
        sortable: false,
        minWidth: 200,
        flex: 1.2,
        valueGetter: ({ row }) => {
          const r = row as SupplierReceiptListItem;
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
        field: "dteFolio",
        headerName: "Folio DTE",
        sortable: false,
        width: 140,
        valueGetter: ({ row }) => dteFolioDisplay(row as SupplierReceiptListItem),
      },
      {
        field: "subtotal",
        headerName: "Neto",
        sortable: true,
        width: 120,
        align: "right",
        valueGetter: ({ row }) => formatMoney(Number((row as SupplierReceiptListItem).subtotal ?? 0)),
      },
      {
        field: "total",
        headerName: "Total",
        sortable: true,
        width: 120,
        align: "right",
        valueGetter: ({ row }) => formatMoney(Number((row as SupplierReceiptListItem).total ?? 0)),
      },
      {
        field: "status",
        headerName: "Estado",
        sortable: false,
        width: 120,
        valueGetter: ({ row }) => String((row as SupplierReceiptListItem).status || "—"),
      },
      {
        field: "actions",
        headerName: "",
        width: 72,
        minWidth: 72,
        align: "center",
        sortable: false,
        filterable: false,
        actionComponent: DteReceiptActionsCell,
      },
    ];
  }, [openDetail]);

  return (
    <>
      <DataGrid
        title="Boletas"
        columns={columns}
        rows={rows}
        totalRows={total}
        totalGeneral={total}
        height="85vh"
        showExportButton={false}
        showSortButton={false}
        showFilterButton={false}
        pinActionsColumn
        createFormTitle="Ingresar Boleta"
        createForm={<CreateSupplierReceiptDialogForm />}
        data-test-id="dte-receipts-data-grid"
      />
      <PurchasingDteDetailDialog
        transactionId={detailTxId}
        open={detailTxId != null}
        onClose={() => setDetailTxId(null)}
        documentLabel="Boleta proveedor"
      />
    </>
  );
}
