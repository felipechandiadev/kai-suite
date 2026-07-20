"use client";

import { useEffect, useState } from "react";
import { Button, LoadingState, TextField } from "@kai/ui";
import { getActiveEmployeeShiftAction } from "@/features/hr-jornada/actions/jornada.action";
import type { EmployeeShiftView } from "@/features/hr-jornada/types/employee-shift.types";
import { WEEKDAY_LABELS } from "@/features/hr-jornada/types/employee-shift.types";
import { TEMPLATE_TYPE_LABELS } from "@/features/hr-jornada/types/jornada.types";
import { EmployeeShiftDialog } from "../EmployeeShiftDialog";
import { employeeSectionCardClass } from "./employee-section-card";

const noop = () => {};

function scheduleSummary(
  schedule: EmployeeShiftView["scheduleJson"],
): string {
  if (!schedule) return "—";
  const parts: string[] = [];
  for (let i = 0; i < 7; i++) {
    const s = schedule[String(i)];
    if (s?.start && s?.end) {
      parts.push(`${WEEKDAY_LABELS[i]} ${s.start}–${s.end}`);
    }
  }
  return parts.length ? parts.join(", ") : "—";
}

type Props = {
  employeeId: string;
  employeeName?: string;
  onChanged?: () => void;
};

export function EmployeeDetailShiftSection({
  employeeId,
  employeeName,
  onChanged,
}: Props) {
  const [shift, setShift] = useState<EmployeeShiftView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = () => {
    const id = employeeId.trim();
    if (!id) return;
    setLoading(true);
    setError(null);
    void getActiveEmployeeShiftAction(id).then((res) => {
      setLoading(false);
      if (!res.success) {
        setError(res.message);
        return;
      }
      setShift(res.data);
    });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  if (loading) {
    return <LoadingState className="flex items-center justify-center py-8" />;
  }

  return (
    <>
      <section
        className={employeeSectionCardClass(false)}
        data-test-id="employee-detail-shift"
      >
        <div className="space-y-1 pr-2">
          <h2 className="text-sm font-semibold text-foreground">Turno activo</h2>
          <p className="text-xs text-muted-foreground">
            Sin turno activo no se pueden cargar celdas en el planificador de
            Jornada.
          </p>
        </div>

        {error ? (
          <p className="text-sm text-error" role="alert">
            {error}
          </p>
        ) : null}

        {!shift ? (
          <div className="space-y-3 py-2" data-test-id="employee-detail-shift-empty">
            <p className="text-sm text-muted-foreground">
              Este empleado no tiene turno ACTIVE.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setDialogOpen(true)}
              data-test-id="employee-detail-shift-create"
            >
              Definir turno
            </Button>
          </div>
        ) : (
          <div className="grid max-w-xl gap-3">
            <TextField
              label="Nombre"
              value={shift.name}
              onChange={noop}
              readOnly
              density="compact"
            />
            <TextField
              label="Tipo"
              value={TEMPLATE_TYPE_LABELS[shift.type] ?? shift.type}
              onChange={noop}
              readOnly
              density="compact"
            />
            <TextField
              label="Horario"
              value={scheduleSummary(shift.scheduleJson)}
              onChange={noop}
              readOnly
              density="compact"
              rows={2}
            />
            <TextField
              label="Noche"
              value={
                shift.isNight || shift.isNightOutgoing
                  ? [
                      shift.isNight ? "Nocturno" : null,
                      shift.isNightOutgoing ? "Saliente" : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")
                  : "No"
              }
              onChange={noop}
              readOnly
              density="compact"
            />
            <div>
              <Button
                variant="outlined"
                size="sm"
                onClick={() => setDialogOpen(true)}
                data-test-id="employee-detail-shift-edit"
              >
                Editar turno
              </Button>
            </div>
          </div>
        )}
      </section>

      <EmployeeShiftDialog
        open={dialogOpen}
        employeeId={employeeId}
        employeeName={employeeName}
        onClose={() => setDialogOpen(false)}
        onSaved={() => {
          load();
          onChanged?.();
        }}
      />
    </>
  );
}
