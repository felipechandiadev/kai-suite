"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DataGridTable as DataGrid } from "@kai/ui";
import type { DataGridColumn } from "@kai/ui";
import { Badge, type BadgeVariant } from "@kai/ui";
import { getTransactionStatusLabel } from "@/features/transactions/types/transaction-types";
import type { RemunerationGridRow } from "@/features/hr-remunerations/types/remuneration.types";
import type { EmployeeGridRow } from "@/features/hr-employees/types/employee.types";
import { CreateRemunerationDialog } from "./CreateRemunerationDialog";

type RemunerationsDataGridProps = {
  rows: RemunerationGridRow[];
  total: number;
  employees: EmployeeGridRow[];
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatDateOnlySlash(value: string | null | undefined): string {
  if (!value?.trim()) return "—";
  const trimmed = String(value).trim();
  const isoDate = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) {
    const [, y, m, d] = isoDate;
    return `${d}/${m}/${y}`;
  }
  const dt = new Date(trimmed);
  if (Number.isNaN(dt.getTime())) return "—";
  return `${pad2(dt.getDate())}/${pad2(dt.getMonth() + 1)}/${dt.getFullYear()}`;
}

function fmtClp(n: number | null | undefined): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(v);
}

function statusBadgeVariant(status: string): BadgeVariant {
  const s = status?.toUpperCase();
  if (s === "COMPLETED" || s === "CONFIRMED" || s === "RECEIVED") return "success-outlined";
  if (s === "DRAFT" || s === "PENDING") return "warning-outlined";
  if (s === "CANCELLED" || s === "VOIDED") return "secondary-outlined";
  return "info-outlined";
}

export default function RemunerationsDataGrid({
  rows,
  total,
  employees,
}: RemunerationsDataGridProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);

  const onSuccess = useCallback(async () => {
    await router.refresh();
  }, [router]);

  const columns: DataGridColumn[] = useMemo(
    () => [
      {
        field: "documentNumber",
        headerName: "Folio",
        sortable: false,
        width: 130,
        valueGetter: ({ row }) => (row as RemunerationGridRow).documentNumber?.trim() || "—",
      },
      {
        field: "date",
        headerName: "Fecha liquidación",
        sortable: false,
        width: 130,
        valueGetter: ({ row }) => formatDateOnlySlash((row as RemunerationGridRow).date),
      },
      {
        field: "employeeName",
        headerName: "Empleado",
        sortable: false,
        minWidth: 220,
        flex: 1,
        valueGetter: ({ row }) => (row as RemunerationGridRow).employeeName?.trim() || "—",
      },
      {
        field: "totalEarnings",
        headerName: "Haberes",
        sortable: false,
        width: 130,
        align: "right",
        valueGetter: ({ row }) => fmtClp((row as RemunerationGridRow).totalEarnings),
      },
      {
        field: "totalDeductions",
        headerName: "Descuentos",
        sortable: false,
        width: 130,
        align: "right",
        valueGetter: ({ row }) => fmtClp((row as RemunerationGridRow).totalDeductions),
      },
      {
        field: "netPayment",
        headerName: "Líquido",
        sortable: false,
        width: 130,
        align: "right",
        valueGetter: ({ row }) => fmtClp((row as RemunerationGridRow).netPayment),
      },
      {
        field: "status",
        headerName: "Estado",
        sortable: false,
        width: 120,
        valueGetter: ({ row }) => String((row as RemunerationGridRow).status || ""),
        renderCell: ({ value, row }) => {
          const key = String(value || "");
          const label = getTransactionStatusLabel(key);
          return (
            <Badge variant={statusBadgeVariant(key)} size="sm" data-test-id={`remuneration-status-${(row as RemunerationGridRow).id}`}>
              {label}
            </Badge>
          );
        },
      },
    ],
    [],
  );

  return (
    <>
      <DataGrid
        title="Remuneraciones"
        columns={columns}
        rows={rows}
        totalRows={total}
        totalGeneral={total}
        height="85vh"
        showExportButton={false}
        showSortButton={false}
        showFilterButton={false}
        showSearch={false}
        onAddClick={() => setCreateOpen(true)}
        data-test-id="remunerations-data-grid"
      />
      <CreateRemunerationDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={onSuccess}
        employees={employees}
      />
    </>
  );
}
