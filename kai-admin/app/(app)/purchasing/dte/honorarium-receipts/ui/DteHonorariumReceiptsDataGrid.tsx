"use client";

import { useMemo } from "react";
import { DataGridTable as DataGrid } from "@kai/ui";
import type { DataGridColumn } from "@kai/ui";
import type { SupplierHonorariumReceiptListItem } from "@/features/purchasing-supplier-honorarium-receipts/types/supplier-honorarium-receipt.types";
import { dteFolioDisplay } from "@/features/purchasing-dte/lib/dte-folio-display";
import { CreateSupplierHonorariumReceiptDialogForm } from "./CreateSupplierHonorariumReceiptDialogForm";

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

type DteHonorariumReceiptsDataGridProps = {
  rows: SupplierHonorariumReceiptListItem[];
  total: number;
};

export default function DteHonorariumReceiptsDataGrid({ rows, total }: DteHonorariumReceiptsDataGridProps) {
  const columns: DataGridColumn[] = useMemo(
    () => [
      {
        field: "documentNumber",
        headerName: "Folio",
        sortable: true,
        minWidth: 140,
        flex: 0.7,
        valueGetter: ({ row }) => {
          const r = row as SupplierHonorariumReceiptListItem;
          return r.documentNumber || r.id?.slice(0, 8) || "—";
        },
      },
      {
        field: "createdAt",
        headerName: "Registro",
        sortable: true,
        width: 160,
        valueGetter: ({ row }) => formatDateTimeSlash((row as SupplierHonorariumReceiptListItem).createdAt),
      },
      {
        field: "supplierName",
        headerName: "Proveedor",
        sortable: false,
        minWidth: 200,
        flex: 1.2,
        valueGetter: ({ row }) => {
          const r = row as SupplierHonorariumReceiptListItem;
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
        valueGetter: ({ row }) => dteFolioDisplay(row as SupplierHonorariumReceiptListItem),
      },
      {
        field: "subtotal",
        headerName: "Neto",
        sortable: true,
        width: 120,
        align: "right",
        valueGetter: ({ row }) => formatMoney(Number((row as SupplierHonorariumReceiptListItem).subtotal ?? 0)),
      },
      {
        field: "total",
        headerName: "Total",
        sortable: true,
        width: 120,
        align: "right",
        valueGetter: ({ row }) => formatMoney(Number((row as SupplierHonorariumReceiptListItem).total ?? 0)),
      },
      {
        field: "status",
        headerName: "Estado",
        sortable: false,
        width: 120,
        valueGetter: ({ row }) => String((row as SupplierHonorariumReceiptListItem).status || "—"),
      },
    ],
    [],
  );

  return (
    <DataGrid
      title="Boletas de honorarios"
      columns={columns}
      rows={rows}
      totalRows={total}
      totalGeneral={total}
      height="85vh"
      showExportButton={false}
      showSortButton={false}
      showFilterButton={false}
      createFormTitle="Ingresar boleta de honorarios"
      createForm={<CreateSupplierHonorariumReceiptDialogForm />}
      data-test-id="dte-honorarium-receipts-data-grid"
    />
  );
}
