"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { DataGridTable as DataGrid } from "@kai/ui";
import type { DataGridColumn } from "@kai/ui";
import type { PurchaseOrderGridRow } from "@/features/purchasing-document/types/purchase-order-list.types";

type PurchaseOrdersDataGridProps = {
  rows: PurchaseOrderGridRow[];
  total: number;
};

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

/** Fechas en UI admin: ver `AGENTS.md` (`DD/MM/YYYY` solo fecha; `DD/MM/YYYY HH:mm` con datetime). */
function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Solo fecha: `03/05/2026` (desde `YYYY-MM-DD` o ISO sin componente hora útil). */
function formatDateOnlySlash(value: string | null | undefined): string {
  if (!value?.trim()) {
    return "—";
  }
  const trimmed = value.trim();
  const isoDate = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) {
    const [, y, m, d] = isoDate;
    return `${d}/${m}/${y}`;
  }
  const dt = new Date(trimmed);
  if (Number.isNaN(dt.getTime())) {
    return "—";
  }
  return `${pad2(dt.getDate())}/${pad2(dt.getMonth() + 1)}/${dt.getFullYear()}`;
}

/** Fecha y hora: `03/05/2026 11:57` (zona local, 24 h). */
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

/** Alias del nombre anterior del formateador (evita `ReferenceError` en RSC/HMR si queda alguna referencia antigua). */
const formatDdMmYyyyHmm = formatDateTimeSlash;

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Borrador",
  CONFIRMED: "Confirmada",
  PARTIALLY_RECEIVED: "Parcial",
  RECEIVED: "Recibida",
  CANCELLED: "Anulada",
  COMPLETED: "Completada",
  VOIDED: "Anulada",
  PENDING: "Pendiente",
};

export default function PurchaseOrdersDataGrid({ rows, total }: PurchaseOrdersDataGridProps) {
  const router = useRouter();

  const columns: DataGridColumn[] = useMemo(
    () => [
      {
        field: "documentNumber",
        headerName: "Folio",
        sortable: true,
        width: 130,
      },
      {
        field: "documentDate",
        headerName: "Fecha doc.",
        sortable: false,
        width: 150,
        valueGetter: ({ row }) =>
          formatDateOnlySlash((row as PurchaseOrderGridRow).documentDate),
      },
      {
        field: "createdAt",
        headerName: "Registro",
        sortable: true,
        width: 160,
        valueGetter: ({ row }) =>
          formatDateTimeSlash((row as PurchaseOrderGridRow).createdAtIso),
      },
      {
        field: "supplierName",
        headerName: "Proveedor",
        sortable: false,
        minWidth: 200,
        flex: 1.2,
      },
      {
        field: "supplierDocumentNumber",
        headerName: "RUT/DNI",
        sortable: false,
        width: 140,
        valueGetter: ({ row }) =>
          String((row as PurchaseOrderGridRow).supplierDocumentNumber || "—"),
      },
      {
        field: "branchName",
        headerName: "Sucursal",
        sortable: false,
        minWidth: 120,
      },
      {
        field: "status",
        headerName: "Estado",
        sortable: false,
        width: 120,
        valueGetter: ({ row }) => {
          const k = String((row as PurchaseOrderGridRow).status || "");
          return STATUS_LABEL[k] ?? k;
        },
      },
      {
        field: "total",
        headerName: "Total",
        sortable: true,
        width: 120,
        align: "right",
        valueGetter: ({ row }) => formatMoney((row as PurchaseOrderGridRow).total),
      },
    ],
    [],
  );

  return (
    <DataGrid
      title=""
      columns={columns}
      rows={rows}
      totalRows={total}
      totalGeneral={total}
      height="85vh"
      showExportButton={false}
      showSortButton={false}
      showFilterButton={false}
      onAddClick={() => router.push("/purchasing/transactions/orders/new")}
      addButtonVariant="pillOutlined"
      addButtonLabel="Orden de compra"
      data-test-id="purchase-orders-data-grid"
    />
  );
}
