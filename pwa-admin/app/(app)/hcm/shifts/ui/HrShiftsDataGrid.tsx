"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DataGridTable as DataGrid, type DataGridColumn, Badge, IconButton } from "@kai/ui";
import type { EmployeeShiftView } from "@/features/hr-jornada/types/employee-shift.types";
import { WEEKDAY_LABELS } from "@/features/hr-jornada/types/employee-shift.types";
import { TEMPLATE_TYPE_LABELS } from "@/features/hr-jornada/types/jornada.types";
import { EmployeeShiftDialog } from "../../employees/ui/EmployeeShiftDialog";

function scheduleSummary(
  schedule: EmployeeShiftView["scheduleJson"],
): string {
  if (!schedule) return "—";
  const parts: string[] = [];
  for (let i = 0; i < 7; i++) {
    const s = schedule[String(i)];
    if (s?.start && s?.end) {
      parts.push(`${WEEKDAY_LABELS[i]} ${s.start}-${s.end}`);
    }
  }
  return parts.length ? parts.join(", ") : "—";
}

export function HrShiftsDataGrid({
  shifts,
  employeeNames,
}: {
  shifts: EmployeeShiftView[];
  employeeNames: Record<string, string>;
}) {
  const router = useRouter();
  const [editEmployeeId, setEditEmployeeId] = useState<string | null>(null);

  const columns: DataGridColumn[] = useMemo(
    () => [
      {
        field: "employee",
        headerName: "Empleado",
        flex: 1,
        minWidth: 160,
        valueGetter: ({ row }) =>
          employeeNames[(row as EmployeeShiftView).employeeId] ??
          (row as EmployeeShiftView).employeeId,
      },
      {
        field: "name",
        headerName: "Turno",
        width: 140,
        valueGetter: ({ row }) => (row as EmployeeShiftView).name,
      },
      {
        field: "type",
        headerName: "Tipo",
        width: 110,
        valueGetter: ({ row }) => {
          const t = (row as EmployeeShiftView).type;
          return TEMPLATE_TYPE_LABELS[t] ?? t;
        },
      },
      {
        field: "schedule",
        headerName: "Horario",
        flex: 1.5,
        minWidth: 220,
        valueGetter: ({ row }) =>
          scheduleSummary((row as EmployeeShiftView).scheduleJson),
      },
      {
        field: "status",
        headerName: "Estado",
        width: 100,
        renderCell: ({ row }) => {
          const s = (row as EmployeeShiftView).status;
          return (
            <Badge variant={s === "ACTIVE" ? "success" : "secondary"}>
              {s === "ACTIVE" ? "Activo" : "Inactivo"}
            </Badge>
          );
        },
      },
      {
        field: "actions",
        headerName: "",
        width: 72,
        sortable: false,
        renderCell: ({ row }) => {
          const r = row as EmployeeShiftView;
          return (
            <IconButton
              icon="Pencil"
              variant="action"
              size="sm"
              ariaLabel="Editar turno"
              onClick={() => setEditEmployeeId(r.employeeId)}
            />
          );
        },
      },
    ],
    [employeeNames],
  );

  return (
    <>
      <DataGrid
        title="Turnos por funcionario"
        rows={shifts}
        columns={columns}
        height="70vh"
        showExportButton={false}
        showSortButton={false}
        showFilterButton={false}
        showSearch={false}
        data-test-id="hr-shifts-grid"
      />
      <EmployeeShiftDialog
        open={editEmployeeId != null}
        employeeId={editEmployeeId ?? ""}
        employeeName={
          editEmployeeId ? employeeNames[editEmployeeId] : undefined
        }
        onClose={() => setEditEmployeeId(null)}
        onSaved={() => router.refresh()}
      />
    </>
  );
}
