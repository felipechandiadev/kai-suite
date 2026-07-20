"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Badge,
  ButtonGroupToggle,
  DataGridTable as DataGrid,
  IconButton,
  type DataGridColumn,
} from "@kai/ui";
import type { EmployeeGridRow } from "@/features/hr-employees/types/employee.types";
import { employeeDisplayName } from "@/features/hr-employees/types/employee.types";
import type { BranchListItem } from "@/features/settings-branches/types/branch.types";
import { employeeDetailPath } from "@/navigation/hcm-routes";
import { CreateEmployeeDialog } from "./CreateEmployeeDialog";
import { EmployeesCardsGrid } from "./EmployeesCardsGrid";
import {
  documentLine,
  EMPLOYEE_EMPLOYMENT_LABEL,
  EMPLOYEE_STATUS_LABEL,
  employeeStatusBadgeVariant,
  formatDateOnlySlash,
  formatMoneyClp,
} from "./employee-detail/employee-detail-labels";

const VIEW_STORAGE_KEY = "hr.employees.view";

type ViewMode = "table" | "cards";

type EmployeesWorkspaceProps = {
  rows: EmployeeGridRow[];
  total: number;
  branches: BranchListItem[];
  laborUnits?: Array<{ id: string; name: string; code?: string }>;
};

function readStoredView(): ViewMode {
  if (typeof window === "undefined") return "cards";
  try {
    const v = localStorage.getItem(VIEW_STORAGE_KEY);
    return v === "table" ? "table" : "cards";
  } catch {
    return "cards";
  }
}

export default function EmployeesWorkspace({
  rows,
  total,
  branches,
  laborUnits = [],
}: EmployeesWorkspaceProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [viewReady, setViewReady] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    setViewMode(readStoredView());
    setViewReady(true);
  }, []);

  const setView = useCallback((next: string) => {
    const mode: ViewMode = next === "cards" ? "cards" : "table";
    setViewMode(mode);
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
  }, []);

  const onSuccess = useCallback(async () => {
    await router.refresh();
  }, [router]);

  const listReturnTo = useMemo(() => {
    const qs = searchParams.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }, [pathname, searchParams]);

  const openEmployee = useCallback(
    (employeeId: string) => {
      router.push(employeeDetailPath(employeeId, { returnTo: listReturnTo }));
    },
    [router, listReturnTo],
  );

  const viewToggle = (
    <ButtonGroupToggle
      aria-label="Modo de vista"
      density="compact"
      value={viewMode}
      onChange={setView}
      options={[
        { id: "table", label: "Lista" },
        { id: "cards", label: "Tarjetas" },
      ]}
      data-test-id="employees-view-toggle"
    />
  );

  const columns: DataGridColumn[] = useMemo(() => {
    function EmployeeActionsCell({ row }: { row: unknown }) {
      const r = row as EmployeeGridRow;
      return (
        <div
          className="flex items-center justify-center gap-0.5"
          data-test-id={`employees-row-actions-${r.id}`}
        >
          <IconButton
            icon="MoreHorizontal"
            variant="action"
            size="sm"
            ariaLabel="Ver ficha del empleado"
            onClick={() => openEmployee(r.id)}
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
        valueGetter: ({ row }) =>
          (row as EmployeeGridRow).person?.email?.trim() || "—",
      },
      {
        field: "phone",
        headerName: "Teléfono",
        sortable: false,
        width: 130,
        valueGetter: ({ row }) =>
          (row as EmployeeGridRow).person?.phone?.trim() || "—",
      },
      {
        field: "branchName",
        headerName: "Sucursal",
        sortable: false,
        minWidth: 160,
        flex: 0.8,
        valueGetter: ({ row }) =>
          (row as EmployeeGridRow).branch?.name?.trim() || "—",
      },
      {
        field: "hireDate",
        headerName: "Ingreso",
        sortable: false,
        width: 110,
        valueGetter: ({ row }) =>
          formatDateOnlySlash((row as EmployeeGridRow).hireDate),
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
        valueGetter: ({ row }) =>
          formatMoneyClp((row as EmployeeGridRow).baseSalary),
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
            <Badge variant={employeeStatusBadgeVariant(key)}>{label}</Badge>
          );
        },
      },
      {
        field: "actions",
        headerName: "",
        minWidth: 56,
        width: 64,
        align: "center",
        sortable: false,
        filterable: false,
        actionComponent: EmployeeActionsCell,
      },
    ];
  }, [openEmployee]);

  const createDialog = (
    <CreateEmployeeDialog
      open={createOpen}
      onClose={() => setCreateOpen(false)}
      onSuccess={onSuccess}
      branches={branches}
      laborUnits={laborUnits}
    />
  );

  if (!viewReady) {
    return (
      <div className="min-h-[40vh]" data-test-id="employees-workspace-loading" />
    );
  }

  if (viewMode === "cards") {
    return (
      <div className="flex flex-col gap-3" data-test-id="employees-workspace-cards">
        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          <div className="flex flex-wrap items-center gap-3">
            {viewToggle}
            <h1 className="text-lg font-semibold text-foreground">Empleados</h1>
            <span className="text-sm text-muted-foreground tabular-nums">
              {total}
            </span>
          </div>
          <IconButton
            icon="Plus"
            variant="primary"
            size="sm"
            ariaLabel="Agregar empleado"
            onClick={() => setCreateOpen(true)}
            data-test-id="employees-cards-add"
          />
        </div>
        <EmployeesCardsGrid
          rows={rows}
          onOpen={openEmployee}
          onAvatarChanged={onSuccess}
        />
        {createDialog}
      </div>
    );
  }

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
        headerActions={viewToggle}
        data-test-id="employees-data-grid"
      />
      {createDialog}
    </>
  );
}
