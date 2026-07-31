"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { DataGridTable as DataGrid } from "@kai/ui";
import type { DataGridColumn } from "@kai/ui";
import { Badge, type BadgeVariant } from "@kai/ui";
import { IconButton } from "@kai/ui";
import {
  CASH_SESSION_STATUS_LABEL,
  type CashSessionListRow,
  type CashSessionListStatus,
} from "@/features/sales-cash-sessions/types/cash-session-list.types";

type CashSessionsDataGridProps = {
  rows: CashSessionListRow[];
  total: number;
};

function formatMoney(amount: number | null | undefined): string {
  if (amount == null || !Number.isFinite(amount)) return "—";
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

function statusBadgeVariant(status: CashSessionListStatus): BadgeVariant {
  if (status === "OPEN") return "success-outlined";
  if (status === "CLOSED") return "secondary-outlined";
  if (status === "RECONCILED") return "info-outlined";
  return "secondary-outlined";
}

export default function CashSessionsDataGrid({
  rows,
  total,
}: CashSessionsDataGridProps) {
  const router = useRouter();

  const openDetail = useCallback(
    (r: CashSessionListRow) => {
      const id = r.id?.trim();
      if (!id) return;
      router.push(`/sales/cash-sessions/${encodeURIComponent(id)}`);
    },
    [router],
  );

  const columns: DataGridColumn[] = useMemo(() => {
    function CashSessionActionsCell({
      row,
    }: {
      row: any;
      column: DataGridColumn;
    }) {
      const r = row as CashSessionListRow;
      return (
        <div
          className="flex items-center justify-center"
          data-test-id={`cash-sessions-row-actions-${r.id}`}
        >
          <IconButton
            icon="MoreHorizontal"
            variant="action"
            size="sm"
            ariaLabel="Ver detalle de la sesión"
            onClick={() => openDetail(r)}
            data-test-id={`cash-sessions-row-detail-${r.id}`}
          />
        </div>
      );
    }

    return [
      {
        field: "openedAt",
        headerName: "Apertura",
        sortable: false,
        width: 160,
        valueGetter: ({ row }) =>
          formatDateTimeSlash((row as CashSessionListRow).openedAt),
      },
      {
        field: "status",
        headerName: "Estado",
        sortable: false,
        width: 130,
        valueGetter: ({ row }) => (row as CashSessionListRow).status,
        renderCell: ({ value }) => {
          const status = value as CashSessionListStatus;
          return (
            <Badge variant={statusBadgeVariant(status)}>
              {CASH_SESSION_STATUS_LABEL[status] ?? status}
            </Badge>
          );
        },
      },
      {
        field: "branchName",
        headerName: "Sucursal",
        sortable: false,
        minWidth: 140,
        valueGetter: ({ row }) => (row as CashSessionListRow).branchName ?? "—",
      },
      {
        field: "pointOfSaleName",
        headerName: "Punto de venta",
        sortable: false,
        minWidth: 160,
        valueGetter: ({ row }) =>
          (row as CashSessionListRow).pointOfSaleName ?? "—",
      },
      {
        field: "openedByFullName",
        headerName: "Abierta por",
        sortable: false,
        minWidth: 180,
        flex: 0.8,
        valueGetter: ({ row }) => {
          const r = row as CashSessionListRow;
          if (r.openedByFullName) return r.openedByFullName;
          return r.openedByUserName ?? "—";
        },
      },
      {
        field: "openingAmount",
        headerName: "Apertura ($)",
        sortable: false,
        width: 130,
        align: "right",
        valueGetter: ({ row }) =>
          formatMoney((row as CashSessionListRow).openingAmount),
      },
      {
        field: "expectedAmount",
        headerName: "Saldo en caja ($)",
        sortable: false,
        width: 150,
        align: "right",
        valueGetter: ({ row }) => {
          const r = row as CashSessionListRow;
          return formatMoney(r.expectedAmount ?? r.openingAmount);
        },
      },
      {
        field: "salesTotal",
        headerName: "Total ventas ($)",
        sortable: false,
        width: 140,
        align: "right",
        valueGetter: ({ row }) =>
          formatMoney((row as CashSessionListRow).salesTotal),
      },
      {
        field: "closedAt",
        headerName: "Cierre",
        sortable: false,
        width: 160,
        valueGetter: ({ row }) =>
          formatDateTimeSlash((row as CashSessionListRow).closedAt),
      },
      {
        field: "closingAmount",
        headerName: "Cierre ($)",
        sortable: false,
        width: 130,
        align: "right",
        valueGetter: ({ row }) =>
          formatMoney((row as CashSessionListRow).closingAmount),
      },
      {
        field: "difference",
        headerName: "Diferencia",
        sortable: false,
        width: 120,
        align: "right",
        valueGetter: ({ row }) =>
          formatMoney((row as CashSessionListRow).difference),
      },
      {
        field: "actions",
        headerName: "",
        width: 72,
        minWidth: 72,
        align: "center",
        sortable: false,
        filterable: false,
        actionComponent: CashSessionActionsCell,
      },
    ];
  }, [openDetail]);

  return (
    <DataGrid
      title="Sesiones de caja"
      columns={columns}
      rows={rows}
      totalRows={total}
      totalGeneral={total}
      height="85vh"
      showExportButton={false}
      showSortButton={false}
      showFilterButton={false}
      pinActionsColumn
      data-test-id="sales-cash-sessions-data-grid"
    />
  );
}
