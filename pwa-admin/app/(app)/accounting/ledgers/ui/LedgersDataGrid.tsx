"use client";

import { useMemo } from "react";
import Link from "next/link";
import { DataGridTable as DataGrid } from "@kai/ui";
import type { DataGridColumn } from "@kai/ui";
import type { LedgerAccountRow } from "@/features/accounting-ledgers/types/ledger-account.types";

type LedgersDataGridProps = {
  rows: LedgerAccountRow[];
  includeInactive: boolean;
};

export default function LedgersDataGrid({ rows, includeInactive }: LedgersDataGridProps) {
  const columns: DataGridColumn[] = useMemo(
    () => [
      {
        field: "code",
        headerName: "Código",
        sortable: true,
        width: 120,
      },
      {
        field: "name",
        headerName: "Nombre",
        sortable: true,
        minWidth: 240,
        flex: 1.2,
      },
    ],
    [],
  );

  const toggleHref = includeInactive ? "/accounting/ledgers" : "/accounting/ledgers?includeInactive=1";
  const toggleLabel = includeInactive ? "Solo activas" : "Incluir inactivas";

  return (
    <DataGrid
      title="Cuentas del libro"
      columns={columns}
      rows={rows}
      totalRows={rows.length}
      totalGeneral={rows.length}
      height="85vh"
      showExportButton={false}
      showSortButton={false}
      showFilterButton={false}
      showSearch={false}
      showFooter={false}
      headerActions={
        <Link
          href={toggleHref}
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          data-test-id="ledgers-toggle-inactive"
        >
          {toggleLabel}
        </Link>
      }
      data-test-id="ledgers-accounts-data-grid"
    />
  );
}
