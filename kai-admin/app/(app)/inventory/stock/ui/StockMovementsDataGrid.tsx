"use client";

import { useMemo } from "react";
import { DataGridTable as DataGrid } from "@kai/ui";
import type { DataGridColumn } from "@kai/ui";
import type { StockMovementRow } from "@/features/inventory-stock/types/stock-grid.types";
import { getTransactionTypeLabel } from "@/features/transactions/types/transaction-types";

export type StockMovementGridRow = StockMovementRow & {
  id: string;
  fecha: string;
  tipo: string;
  documento: string;
  sentido: string;
  cantidad: string;
  saldo: string;
  contraparte: string;
  notas: string;
  direction: "IN" | "OUT";
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatDateTime(value: string | null | undefined): string {
  if (!value?.trim()) {
    return "—";
  }
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) {
    return "—";
  }
  return `${pad2(dt.getDate())}/${pad2(dt.getMonth() + 1)}/${dt.getFullYear()} ${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`;
}

function formatQty(n: number): string {
  return new Intl.NumberFormat("es-CL", { maximumFractionDigits: 3 }).format(n);
}

function counterpartyLabel(m: StockMovementRow): string {
  if (m.direction === "IN") {
    return m.targetStorageName?.trim() || m.storageName?.trim() || "—";
  }
  return m.storageName?.trim() || m.targetStorageName?.trim() || "—";
}

export function mapStockMovementsToGridRows(rows: StockMovementRow[]): StockMovementGridRow[] {
  return rows.map((m, index) => {
    const id = m.lineId?.trim() || `${m.transactionId}-${m.createdAt}-${index}`;
    const qtyAbs = formatQty(Math.abs(m.quantity));
    const cantidad = `${m.direction === "OUT" ? "−" : "+"}${qtyAbs}`;
    const saldo =
      m.balanceAfter != null && Number.isFinite(m.balanceAfter)
        ? formatQty(m.balanceAfter)
        : "—";
    return {
      ...m,
      id,
      fecha: formatDateTime(m.createdAt),
      tipo: getTransactionTypeLabel(m.transactionType),
      documento: m.documentNumber?.trim() || "—",
      sentido: m.direction === "IN" ? "Entrada" : "Salida",
      cantidad,
      saldo,
      contraparte: counterpartyLabel(m),
      notas: m.notes?.trim() || "—",
      direction: m.direction,
    };
  });
}

const columns: DataGridColumn[] = [
  { field: "fecha", headerName: "Fecha", width: 150, sortable: false, filterable: false },
  { field: "tipo", headerName: "Tipo", minWidth: 140, flex: 1.2, sortable: false, filterable: false },
  {
    field: "documento",
    headerName: "Documento",
    minWidth: 120,
    flex: 0.9,
    sortable: false,
    filterable: false,
    renderCell: ({ value }) => (
      <span className="font-mono text-xs text-foreground">{String(value ?? "—")}</span>
    ),
  },
  {
    field: "sentido",
    headerName: "Sentido",
    width: 100,
    sortable: false,
    filterable: false,
    renderCell: ({ row }) => {
      const r = row as StockMovementGridRow;
      return (
        <span
          className={
            r.direction === "IN" ? "font-medium text-success" : "font-medium text-error"
          }
        >
          {r.sentido}
        </span>
      );
    },
  },
  {
    field: "cantidad",
    headerName: "Cantidad",
    width: 110,
    align: "right",
    sortable: false,
    filterable: false,
    renderCell: ({ value }) => (
      <span className="font-mono tabular-nums text-foreground">{String(value ?? "—")}</span>
    ),
  },
  {
    field: "saldo",
    headerName: "Saldo",
    width: 110,
    align: "right",
    sortable: false,
    filterable: false,
    renderCell: ({ value }) => (
      <span className="font-mono tabular-nums font-medium text-foreground">
        {String(value ?? "—")}
      </span>
    ),
  },
  {
    field: "contraparte",
    headerName: "Origen / destino",
    minWidth: 140,
    flex: 1,
    sortable: false,
    filterable: false,
    cellOverflow: "truncate",
  },
  {
    field: "notas",
    headerName: "Notas",
    minWidth: 160,
    flex: 1.2,
    sortable: false,
    filterable: false,
    cellOverflow: "truncate",
  },
];

export type StockMovementsDataGridProps = {
  rows: StockMovementRow[];
  total: number;
  loading?: boolean;
  page: number;
  limit: number;
  onPaginationChange: (next: { page: number; limit: number }) => void;
};

export function StockMovementsDataGrid({
  rows,
  total,
  loading = false,
  page,
  limit,
  onPaginationChange,
}: StockMovementsDataGridProps) {
  const gridRows = useMemo(() => mapStockMovementsToGridRows(rows), [rows]);

  return (
    <DataGrid
      columns={columns}
      rows={gridRows}
      totalRows={total}
      loading={loading}
      paginationMode="controlled"
      page={page}
      limit={limit}
      onPaginationChange={onPaginationChange}
      height="min(52vh, 560px)"
      showBorder={false}
      showSearch={false}
      showSortButton={false}
      showFilterButton={false}
      showExportButton={false}
      data-test-id="stock-movements-data-grid"
    />
  );
}
