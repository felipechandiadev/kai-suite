"use client";

import { useMemo } from "react";
import { DataGridTable as DataGrid } from "@kai/ui";
import type { DataGridColumn } from "@kai/ui";
import type { TreasuryCashMovementGridRow } from "./treasury-cash-hub-movements-mapper";

const columns: DataGridColumn[] = [
  { field: "fecha", headerName: "Fecha", width: 140, sortable: false, filterable: false },
  { field: "tipo", headerName: "Tipo", minWidth: 120, flex: 1, sortable: false, filterable: false },
  { field: "documento", headerName: "Documento", minWidth: 100, flex: 1, sortable: false, filterable: false },
  { field: "contraparte", headerName: "Contraparte", minWidth: 120, flex: 1, sortable: false, filterable: false },
  { field: "total", headerName: "Monto", width: 120, align: "right", sortable: false, filterable: false },
  { field: "saldo", headerName: "Saldo", width: 130, align: "right", sortable: false, filterable: false },
];

export default function TreasuryCashMovementsGrid({
  rows,
  total,
  cashHubName,
}: {
  rows: TreasuryCashMovementGridRow[];
  total: number;
  cashHubName?: string | null;
}) {
  const safeRows = useMemo(() => rows.map((r) => ({ ...r })), [rows]);
  const hubLabel = cashHubName?.trim();
  const title = hubLabel ? `Movimientos del centro · ${hubLabel}` : "Movimientos del centro";
  return (
    <DataGrid
      title={title}
      columns={columns}
      rows={safeRows}
      height="min(420px, 55vh)"
      totalRows={total}
      showBorder={false}
      showSearch={false}
      showSortButton={false}
      showFilterButton={false}
      showExportButton={false}
      showFooter={false}
      data-test-id="treasury-cash-movements-grid"
    />
  );
}

