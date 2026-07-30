"use client";

import { useEffect, useState, useTransition } from "react";
import { Alert, Button, Dialog, Select, TextField, Switch } from "@kai/ui";
import {
  createEmployeeShiftAction,
  getActiveEmployeeShiftAction,
  updateEmployeeShiftAction,
} from "@/features/hr-jornada/actions/jornada.action";
import type { EmployeeShiftView } from "@/features/hr-jornada/types/employee-shift.types";
import { WEEKDAY_LABELS } from "@/features/hr-jornada/types/employee-shift.types";
import { TEMPLATE_TYPE_LABELS } from "@/features/hr-jornada/types/jornada.types";

type DaySlot = { start: string; end: string };

type Props = {
  open: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName?: string;
  onSaved?: () => void;
};

function emptySchedule(): Record<string, DaySlot | null> {
  const s: Record<string, DaySlot | null> = {};
  for (let i = 0; i < 5; i++) {
    s[String(i)] = { start: "09:00", end: "18:00" };
  }
  s["5"] = null;
  s["6"] = null;
  return s;
}

/** Normaliza HH:mm para input type=time (descarta segundos si vienen del API). */
function toTimeInputValue(value: string | undefined): string {
  const v = value?.trim() ?? "";
  if (!v) return "";
  const m = v.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return v;
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}

export function EmployeeShiftDialog({
  open,
  onClose,
  employeeId,
  employeeName,
  onSaved,
}: Props) {
  const [shift, setShift] = useState<EmployeeShiftView | null>(null);
  const [name, setName] = useState("Turno semanal");
  const [type, setType] = useState("WEEKLY");
  const [schedule, setSchedule] = useState(emptySchedule);
  const [isNight, setIsNight] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !employeeId) return;
    startTransition(async () => {
      const res = await getActiveEmployeeShiftAction(employeeId);
      if (!res.success) {
        setError(res.message);
        return;
      }
      const s = res.data;
      setShift(s);
      if (s) {
        setName(s.name);
        setType(s.type);
        setIsNight(s.isNight);
        const next = emptySchedule();
        for (let i = 0; i < 7; i++) {
          const slot = s.scheduleJson?.[String(i)];
          next[String(i)] =
            slot?.start && slot?.end
              ? {
                  start: toTimeInputValue(slot.start),
                  end: toTimeInputValue(slot.end),
                }
              : null;
        }
        setSchedule(next);
      } else {
        setName("Turno semanal");
        setType("WEEKLY");
        setSchedule(emptySchedule());
        setIsNight(false);
      }
    });
  }, [open, employeeId]);

  function setDay(i: number, enabled: boolean) {
    setSchedule((prev) => ({
      ...prev,
      [String(i)]: enabled ? { start: "09:00", end: "18:00" } : null,
    }));
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Turno${employeeName ? ` — ${employeeName}` : ""}`}
      size="md"
      scroll="paper"
      maxHeight="min(90vh, 720px)"
      actions={
        <>
          <Button variant="outlined" onClick={onClose} disabled={pending}>
            Cerrar
          </Button>
          <Button
            variant="primary"
            disabled={pending || !name.trim()}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const body = {
                  employeeId,
                  name: name.trim(),
                  type,
                  scheduleJson: schedule,
                  isNight,
                  status: "ACTIVE",
                };
                const res = shift
                  ? await updateEmployeeShiftAction(shift.id, body)
                  : await createEmployeeShiftAction(body);
                if (!res.success) {
                  setError(res.message);
                  return;
                }
                onSaved?.();
                onClose();
              });
            }}
          >
            Guardar turno activo
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {error ? <Alert variant="error">{error}</Alert> : null}
        <TextField
          label="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Select
          label="Tipo"
          value={type}
          onChange={(id) => setType(String(id ?? "WEEKLY"))}
          options={Object.entries(TEMPLATE_TYPE_LABELS).map(([id, label]) => ({
            id,
            label,
          }))}
        />
        <div className="flex items-center gap-2">
          <Switch checked={isNight} onChange={setIsNight} />
          <span className="text-sm text-foreground">Turno de noche</span>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Horario semanal
          </p>
          {WEEKDAY_LABELS.map((label, i) => {
            const slot = schedule[String(i)];
            return (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <label className="flex w-16 items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={!!slot}
                    onChange={(e) => setDay(i, e.target.checked)}
                  />
                  {label}
                </label>
                {slot ? (
                  <>
                    <TextField
                      label="Inicio"
                      type="time"
                      value={slot.start}
                      onChange={(e) =>
                        setSchedule((prev) => ({
                          ...prev,
                          [String(i)]: {
                            start: e.target.value,
                            end: prev[String(i)]?.end ?? "18:00",
                          },
                        }))
                      }
                      density="compact"
                    />
                    <TextField
                      label="Fin"
                      type="time"
                      value={slot.end}
                      onChange={(e) =>
                        setSchedule((prev) => ({
                          ...prev,
                          [String(i)]: {
                            start: prev[String(i)]?.start ?? "09:00",
                            end: e.target.value,
                          },
                        }))
                      }
                      density="compact"
                    />
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">Libre</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Dialog>
  );
}
