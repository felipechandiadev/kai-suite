"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DataGridTable as DataGrid } from "@kai/ui";
import type { DataGridColumn } from "@kai/ui";
import { Badge } from "@kai/ui";
import { IconButton } from "@kai/ui";
import type { EmployeeGridRow } from "@/features/hr-employees/types/employee.types";
import { employeeDisplayName } from "@/features/hr-employees/types/employee.types";
import type { BranchListItem } from "@/features/settings-branches/types/branch.types";
import { CreateEmployeeDialog } from "./CreateEmployeeDialog";
import { EmployeeDetailDialog } from "./EmployeeDetailDialog";
import {
  documentLine,
  EMPLOYEE_EMPLOYMENT_LABEL,
  EMPLOYEE_STATUS_LABEL,
  employeeStatusBadgeVariant,
  formatDateOnlySlash,
  formatMoneyClp,
} from "./employee-detail/employee-detail-labels";

type EmployeesDataGridProps = {
  rows: EmployeeGridRow[];
  total: number;
  branches: BranchListItem[];
};

export default function EmployeesDataGrid({ rows, total, branches }: EmployeesDataGridProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [detailEmployeeId, setDetailEmployeeId] = useState<string | null>(null);

  const onSuccess = useCallback(async () => {
    await router.refresh();
  }, [router]);

  const columns: DataGridColumn[] = useMemo(() => {
    function EmployeeActionsCell({ row }: { row: unknown }) {
      const r = row as EmployeeGridRow;
      return (
        <div className="flex items-center justify-center" data-test-id={`employees-row-actions-${r.id}`}>
          <IconButton
            icon="MoreHorizontal"
            variant="action"
            size="sm"
            ariaLabel="Ver detalle del empleado"
            onClick={() => setDetailEmployeeId(r.id)}
            data-test-id={`employees-row-detail-${r.id}`}
          />
        </div>
      );
    }

    return [
      {
        field: "displayName",
        headerName: "Nombre",
        sortable: false,
        minWidth: 220,
        flex: 1,
        valueGetter: ({ row }) => employeeDisplayName(row as EmployeeGridRow),
      },
      {
        field: "document",
        headerName: "Documento",
        sortable: false,
        minWidth: 150,
        width: 170,
        valueGetter: ({ row }) => documentLine((row as EmployeeGridRow).person),
      },
      {
        field: "email",
        headerName: "Correo",
        sortable: false,
        minWidth: 180,
        flex: 0.9,
        valueGetter: ({ row }) => (row as EmployeeGridRow).person?.email?.trim() || "—",
      },
      {
        field: "phone",
        headerName: "Teléfono",
        sortable: false,
        width: 130,
        valueGetter: ({ row }) => (row as EmployeeGridRow).person?.phone?.trim() || "—",
      },
      {
        field: "branchName",
        headerName: "Sucursal",
        sortable: false,
        minWidth: 160,
        flex: 0.8,
        valueGetter: ({ row }) => (row as EmployeeGridRow).branch?.name?.trim() || "—",
      },
      {
        field: "hireDate",
        headerName: "Ingreso",
        sortable: false,
        width: 110,
        valueGetter: ({ row }) => formatDateOnlySlash((row as EmployeeGridRow).hireDate),
      },
      {
        field: "employmentType",
        headerName: "Contrato",
        sortable: false,
        width: 150,
        valueGetter: ({ row }) => {
          const k = String((row as EmployeeGridRow).employmentType || "");
          return EMPLOYEE_EMPLOYMENT_LABEL[k] ?? (k || "—");
        },
      },
      {
        field: "baseSalary",
        headerName: "Sueldo base",
        sortable: false,
        width: 130,
        align: "right",
        valueGetter: ({ row }) => formatMoneyClp((row as EmployeeGridRow).baseSalary),
      },
      {
        field: "status",
        headerName: "Estado",
        sortable: false,
        width: 120,
        valueGetter: ({ row }) => String((row as EmployeeGridRow).status || ""),
        renderCell: ({ value }) => {
          const key = String(value || "");
          const label = EMPLOYEE_STATUS_LABEL[key] ?? (key || "—");
          return (
            <Badge variant={employeeStatusBadgeVariant(key)}>
              {label}
            </Badge>
          );
        },
      },
      {
        field: "actions",
        headerName: "",
        width: 72,
        minWidth: 72,
        align: "center",
        sortable: false,
        filterable: false,
        actionComponent: EmployeeActionsCell,
      },
    ];
  }, []);

  return (
    <>
      <DataGrid
        title="Empleados"
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
        pinActionsColumn
        data-test-id="employees-data-grid"
      />
      <CreateEmployeeDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={onSuccess}
        branches={branches}
      />
      <EmployeeDetailDialog
        open={detailEmployeeId != null}
        employeeId={detailEmployeeId}
        onClose={() => setDetailEmployeeId(null)}
        branches={branches}
      />
    </>
  );
}
