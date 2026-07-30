"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, LoadingState, TextField } from "@kai/ui";
import { getActiveLaborUnitShiftForEmployeeAction } from "@/features/hr-labor-unit-shifts/actions/labor-unit-shift.action";
import type { LaborUnitShiftView } from "@/features/hr-labor-unit-shifts/types/labor-unit-shift.types";
import { WEEKDAY_LABELS } from "@/features/hr-jornada/types/employee-shift.types";
import { HCM_WORK_SCHEDULES_SHIFTS } from "@/navigation/hcm-routes";
import { employeeSectionCardClass } from "./employee-section-card";

const noop = () => {};

function scheduleSummary(
  schedule: LaborUnitShiftView["scheduleJson"],
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

export function EmployeeDetailShiftSection({ employeeId }: Props) {
  const [shift, setShift] = useState<LaborUnitShiftView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = employeeId.trim();
    if (!id) return;
    setLoading(true);
    setError(null);
    void getActiveLaborUnitShiftForEmployeeAction(id).then((res) => {
      setLoading(false);
      if (!res.success) {
        setError(res.message);
        return;
      }
      setShift(res.data?.shift ?? null);
    });
  }, [employeeId]);

  if (loading) {
    return <LoadingState className="flex items-center justify-center py-8" />;
  }

  return (
    <section
      className={employeeSectionCardClass(false)}
      data-test-id="employee-detail-shift"
    >
      <h2 className="text-sm font-semibold text-foreground">Turno (unidad laboral)</h2>
      <p className="text-xs text-muted-foreground">
        El horario operativo se define en Turnos UL y el planificador (contratos
        rotativos/excepcionales) o en el contrato (jornada fija). Aquí solo se
        consulta la asignación activa.
      </p>

      {error ? (
        <p className="text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}

      {!shift ? (
        <div className="space-y-3 py-2" data-test-id="employee-detail-shift-empty">
          <p className="text-sm text-muted-foreground">
            Sin membresía ACTIVE a un turno de unidad laboral.
          </p>
          <Link
            href={HCM_WORK_SCHEDULES_SHIFTS}
            className="inline-flex"
            data-test-id="employee-detail-shift-goto"
          >
            <Button variant="outlined" size="sm" type="button">
              Ir a Turnos UL
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Turno"
            value={`${shift.code} · ${shift.name}`}
            onChange={noop}
            readOnly
          />
          <TextField
            label="Zona horaria"
            value={shift.timezone}
            onChange={noop}
            readOnly
          />
          <div className="sm:col-span-2">
            <TextField
              label="Horario"
              value={scheduleSummary(shift.scheduleJson)}
              onChange={noop}
              readOnly
              rows={2}
            />
          </div>
          <div className="sm:col-span-2">
            <Link href={HCM_WORK_SCHEDULES_SHIFTS} className="inline-flex">
              <Button variant="outlined" size="sm" type="button">
                Ver maestro de turnos
              </Button>
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
