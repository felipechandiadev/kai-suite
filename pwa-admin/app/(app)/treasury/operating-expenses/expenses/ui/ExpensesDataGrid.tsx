"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DataGridTable as DataGrid } from "@kai/ui";
import type { DataGridColumn } from "@kai/ui";
import type {
  ExpenseCategoryOption,
  OperationalExpenseGridRow,
} from "@/features/treasury-expenses/types/operational-expense.types";
import {
  OPERATIONAL_EXPENSE_DOCUMENT_KIND_LABELS,
  OPERATIONAL_EXPENSE_PAYMENT_STATUS_LABELS,
} from "@/features/treasury-expenses/types/operational-expense.types";
import { CreateOperationalExpenseDialog } from "./CreateOperationalExpenseDialog";

type ExpensesDataGridProps = {
  rows: OperationalExpenseGridRow[];
  total: number;
  categories: ExpenseCategoryOption[];
};

function fmtClp(n: number | null | undefined): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(v);
}

export default function ExpensesDataGrid({ rows, total, categories }: ExpensesDataGridProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);

  const columns: DataGridColumn[] = useMemo(
    () => [
      {
        field: "documentNumber",
        headerName: "Folio",
        sortable: true,
        width: 148,
        valueGetter: ({ row }) => {
          const r = row as OperationalExpenseGridRow;
          const folio = r.documentNumber?.trim() || r.referenceNumber?.trim();
          return folio || "—";
        },
        renderCell: ({ value }) => {
          const folio = String(value ?? "—");
          return (
            <span
              className="block truncate font-mono text-xs text-foreground"
              title={folio !== "—" ? folio : undefined}
            >
              {folio}
            </span>
          );
        },
      },
      {
        field: "name",
        headerName: "Nombre",
        sortable: true,
        minWidth: 180,
      },
      {
        field: "referenceNumber",
        headerName: "Referencia",
        sortable: true,
        minWidth: 140,
        valueGetter: ({ row }) => (row as OperationalExpenseGridRow).referenceNumber || "—",
      },
      {
        field: "documentKind",
        headerName: "Documento",
        sortable: false,
        width: 140,
        valueGetter: ({ row }) => {
          const kind = (row as OperationalExpenseGridRow).documentKind;
          return kind ? OPERATIONAL_EXPENSE_DOCUMENT_KIND_LABELS[kind] : "—";
        },
      },
      {
        field: "supplierName",
        headerName: "Proveedor",
        sortable: false,
        minWidth: 180,
        valueGetter: ({ row }) => (row as OperationalExpenseGridRow).supplierName || "—",
      },
      {
        field: "paymentStatus",
        headerName: "Estado pago",
        sortable: false,
        width: 120,
        valueGetter: ({ row }) => {
          const ps = (row as OperationalExpenseGridRow).paymentStatus;
          return ps ? OPERATIONAL_EXPENSE_PAYMENT_STATUS_LABELS[ps] : "—";
        },
      },
      {
        field: "operationDate",
        headerName: "Fecha",
        sortable: true,
        width: 120,
      },
      {
        field: "categoryName",
        headerName: "Categoría",
        sortable: true,
        minWidth: 220,
        flex: 1,
      },
      {
        field: "netAmount",
        headerName: "Neto",
        sortable: false,
        width: 120,
        align: "right",
        valueGetter: ({ row }) => fmtClp((row as OperationalExpenseGridRow).netAmount),
      },
      {
        field: "taxAmount",
        headerName: "Impuestos",
        sortable: false,
        width: 120,
        align: "right",
        valueGetter: ({ row }) => fmtClp((row as OperationalExpenseGridRow).taxAmount),
      },
      {
        field: "totalAmount",
        headerName: "Total",
        sortable: false,
        width: 120,
        align: "right",
        valueGetter: ({ row }) => fmtClp((row as OperationalExpenseGridRow).totalAmount),
      },
      {
        field: "description",
        headerName: "Descripción",
        sortable: false,
        minWidth: 240,
        flex: 1,
        valueGetter: ({ row }) => (row as OperationalExpenseGridRow).description || "—",
      },
    ],
    [],
  );

  const onSuccess = useCallback(async () => {
    await router.refresh();
  }, [router]);

  return (
    <>
      <DataGrid
        title="Gastos operativos"
        columns={columns}
        rows={rows}
        totalRows={total}
        totalGeneral={total}
        height="85vh"
        showExportButton={false}
        showFilterButton={false}
        showSortButton={false}
        onAddClick={() => setCreateOpen(true)}
        data-test-id="operational-expenses-data-grid"
      />
      <CreateOperationalExpenseDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={onSuccess}
        categoryOptions={categories}
      />
    </>
  );
}

