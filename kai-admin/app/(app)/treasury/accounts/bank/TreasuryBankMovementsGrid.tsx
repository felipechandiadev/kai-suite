"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
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
    field: "medioPago",
    headerName: "Medio pago",
    width: 120,
    sortable: false,
    filterable: false,
  },
  {
    field: "direccion",
    headerName: "Tipo mov.",
    width: 90,
    sortable: false,
    filterable: false,
    renderCell: (params) => {
      const dir = params.value as "IN" | "OUT";
      return (
        <span
          className={
            dir === "IN"
              ? "text-xs font-semibold text-green-700 dark:text-green-400"
              : "text-xs font-semibold text-red-600 dark:text-red-400"
          }
        >
          {dir === "IN" ? "↑ Ingreso" : "↓ Egreso"}
        </span>
      );
    },
  },
  {
    field: "total",
    headerName: "Monto",
    width: 130,
    align: "right",
    sortable: false,
    filterable: false,
    renderCell: (params) => {
      const row = params.row as TreasuryMovementGridRow;
      return (
        <span
          className={
            row.direccion === "IN"
              ? "tabular-nums font-medium text-green-700 dark:text-green-400"
              : "tabular-nums font-medium text-red-600 dark:text-red-400"
          }
        >
          {row.direccion === "IN" ? "+" : "-"}
          {params.value as string}
        </span>
      );
    },
  },
  {
    field: "saldo",
    headerName: "Saldo",
    width: 130,
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
  const searchParams = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "25", 10)));

  const pagedRows = useMemo(() => {
    const start = (page - 1) * limit;
    return rows.slice(start, start + limit).map((r) => ({ ...r }));
  }, [rows, page, limit]);

  return (
    <DataGrid
      title="Movimientos de la cuenta"
      columns={columns}
      rows={pagedRows}
      height="min(460px, 60vh)"
      totalRows={total}
      limit={limit}
      showBorder={false}
      showSearch={false}
      showSortButton={false}
      showFilterButton={false}
      showExportButton={false}
      data-test-id="treasury-bank-movements-grid"
    />
  );
}
