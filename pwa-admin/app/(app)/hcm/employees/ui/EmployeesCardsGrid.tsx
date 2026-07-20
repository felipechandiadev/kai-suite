"use client";

import { Badge, Card } from "@kai/ui";
import type { EmployeeGridRow } from "@/features/hr-employees/types/employee.types";
import { employeeDisplayName } from "@/features/hr-employees/types/employee.types";
import { WORK_REGIME_LABELS } from "@/features/hr-jornada/types/jornada.types";
import { EmployeeAvatarField } from "./EmployeeAvatarField";
import {
  documentLine,
  EMPLOYEE_STATUS_LABEL,
  employeeStatusBadgeVariant,
  formatMoneyClp,
} from "./employee-detail/employee-detail-labels";

type EmployeesCardsGridProps = {
  rows: EmployeeGridRow[];
  onOpen: (employeeId: string) => void;
  onAvatarChanged?: () => void;
};

export function EmployeesCardsGrid({
  rows,
  onOpen,
  onAvatarChanged,
}: EmployeesCardsGridProps) {
  if (rows.length === 0) {
    return (
      <p
        className="py-12 text-center text-sm text-muted-foreground"
        data-test-id="employees-cards-empty"
      >
        No hay empleados para mostrar.
      </p>
    );
  }

  return (
    <div
      className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4 p-1"
      data-test-id="employees-cards-grid"
    >
      {rows.map((row) => {
        const statusKey = String(row.status || "");
        const regime =
          WORK_REGIME_LABELS[String(row.workRegime || "")] ??
          row.workRegime ??
          "—";
        const branch = row.branch?.name?.trim() || "Sin sucursal";
        return (
          <Card
            key={row.id}
            fillHeight
            data-test-id={`employees-card-${row.id}`}
            media={
              <div className="flex justify-center overflow-visible px-2 pb-2 pt-3">
                <EmployeeAvatarField
                  employeeId={row.id}
                  size="sm"
                  onChanged={onAvatarChanged}
                  data-test-id={`employees-card-avatar-${row.id}`}
                />
              </div>
            }
            title={employeeDisplayName(row)}
            subtitle={`${documentLine(row.person)} · ${branch}`}
            headerEnd={
              <Badge variant={employeeStatusBadgeVariant(statusKey)}>
                {EMPLOYEE_STATUS_LABEL[statusKey] ?? (statusKey || "—")}
              </Badge>
            }
            content={
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>
                  <span className="text-foreground/80">Régimen:</span> {regime}
                </p>
                <p className="tabular-nums">
                  <span className="text-foreground/80">Sueldo:</span>{" "}
                  {formatMoneyClp(row.baseSalary)}
                </p>
              </div>
            }
            actions={[
              {
                icon: "MoreHorizontal",
                ariaLabel: "Ver ficha del empleado",
                onClick: () => onOpen(row.id),
                "data-test-id": `employees-card-detail-${row.id}`,
              },
            ]}
          />
        );
      })}
    </div>
  );
}
