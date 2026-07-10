"use client";

import { useMemo } from "react";
import { DataGridTable as DataGrid } from "@kai/ui";
import type { DataGridColumn } from "@kai/ui";
import type { TreasuryMovementGridRow } from "./treasury-movements-mapper";

const columns: DataGridColumn[] = [
  {
    field: "fecha",
    headerName: "Fecha",
    width: 140,
    sortable: false,
    filterable: false,
  },
  {
    field: "tipo",
    headerName: "Tipo",
    minWidth: 120,
    flex: 1,
    sortable: false,
    filterable: false,
  },
  {
    field: "documento",
    headerName: "Documento",
    minWidth: 100,
    flex: 1,
    sortable: false,
    filterable: false,
  },
  {
    field: "contraparte",
    headerName: "Contraparte",
    minWidth: 120,
    flex: 1,
    sortable: false,
    filterable: false,
  },
  {
    field: "total",
    headerName: "Monto",
    width: 120,
    align: "right",
    sortable: false,
    filterable: false,
  },
  {
    field: "estado",
    headerName: "Estado",
    width: 100,
    sortable: false,
    filterable: false,
  },
];

export default function TreasuryBankMovementsGrid({
  rows,
  total,
}: {
  rows: TreasuryMovementGridRow[];
  total: number;
}) {
  const safeRows = useMemo(() => rows.map((r) => ({ ...r })), [rows]);

  return (
    <DataGrid
      title="Movimientos de la cuenta"
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
      data-test-id="treasury-bank-movements-grid"
    />
  );
}
