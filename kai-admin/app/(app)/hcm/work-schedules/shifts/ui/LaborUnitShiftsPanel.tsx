"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Badge, Button, Card, Dialog, Select, Switch, TextField } from "@kai/ui";
import { listLaborUnitsAction } from "@/features/hr-labor-units/actions/labor-unit.action";
import type { LaborUnitView } from "@/features/hr-labor-units/types/labor-unit.types";
import { listEmployeesForGridAction } from "@/features/hr-employees/actions/employee.action";
import {
  addLaborUnitShiftMemberAction,
  createLaborUnitShiftAction,
  listLaborUnitShiftMembersAction,
  listLaborUnitShiftsAction,
  removeLaborUnitShiftMemberAction,
  updateLaborUnitShiftAction,
} from "@/features/hr-labor-unit-shifts/actions/labor-unit-shift.action";
import type {
  LaborUnitShiftMemberView,
  LaborUnitShiftView,
} from "@/features/hr-labor-unit-shifts/types/labor-unit-shift.types";
import { WEEKDAY_LABELS } from "@/features/hr-jornada/types/employee-shift.types";

type EmployeeOpt = { id: string; label: string; laborUnitId?: string | null };
type ScheduleSlot = { start?: string; end?: string } | null;

function emptySchedule(): Record<string, { start: string; end: string } | null> {
  const s: Record<string, { start: string; end: string } | null> = {};
  for (let i = 0; i < 5; i++) {
    s[String(i)] = { start: "09:00", end: "18:00" };
  }
  s["5"] = null;
  s["6"] = null;
  return s;
}

function hasAnySlot(schedule: Record<string, ScheduleSlot>): boolean {
  return Object.values(schedule).some((s) => s?.start && s?.end);
}

function scheduleLines(
  schedule: LaborUnitShiftView["scheduleJson"],
): string[] {
  if (!schedule) return [];
  const lines: string[] = [];
  for (let i = 0; i < 7; i++) {
    const s = schedule[String(i)];
    if (s?.start && s?.end) {
      lines.push(`${WEEKDAY_LABELS[i]} ${s.start}–${s.end}`);
    }
  }
  return lines;
}

export function LaborUnitShiftsPanel() {
  const router = useRouter();
  const [units, setUnits] = useState<LaborUnitView[]>([]);
  const [laborUnitId, setLaborUnitId] = useState<string | null>(null);
  const [shifts, setShifts] = useState<LaborUnitShiftView[]>([]);
  const [employees, setEmployees] = useState<EmployeeOpt[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LaborUnitShiftView | null>(null);
  const [name, setName] = useState("");
  const [schedule, setSchedule] = useState(emptySchedule());
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [effectiveTo, setEffectiveTo] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [membersOpen, setMembersOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<LaborUnitShiftView | null>(
    null,
  );
  const [members, setMembers] = useState<LaborUnitShiftMemberView[]>([]);
  const [addEmployeeId, setAddEmployeeId] = useState<string | null>(null);

  const unitEmployees = useMemo(
    () =>
      employees.filter(
        (e) => !laborUnitId || e.laborUnitId === laborUnitId,
      ),
    [employees, laborUnitId],
  );

  function reloadShifts(ulId: string | null) {
    if (!ulId) {
      setShifts([]);
      return;
    }
    startTransition(async () => {
      const res = await listLaborUnitShiftsAction(ulId);
      if (!res.success) {
        setError(res.message);
        return;
      }
      setShifts(res.data);
    });
  }

  useEffect(() => {
    startTransition(async () => {
      const [ulRes, empRows] = await Promise.all([
        listLaborUnitsAction({ includeInactive: false }),
        listEmployeesForGridAction({}),
      ]);
      if (ulRes.success) {
        setUnits(ulRes.data);
        if (ulRes.data[0]) {
          setLaborUnitId(ulRes.data[0].id);
          reloadShifts(ulRes.data[0].id);
        }
      }
      setEmployees(
        empRows.map((e) => {
          const p = e.person;
          const label =
            [p?.firstName, p?.lastName].filter(Boolean).join(" ").trim() ||
            p?.businessName ||
            e.id;
          return {
            id: e.id,
            label,
            laborUnitId: e.laborUnitId ?? null,
          };
        }),
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate() {
    setEditing(null);
    setName("");
    setSchedule(emptySchedule());
    setEffectiveFrom("");
    setEffectiveTo("");
    setIsActive(true);
    setError(null);
    setDialogOpen(true);
  }

  function openEdit(s: LaborUnitShiftView) {
    setEditing(s);
    setName(s.name);
    const next = emptySchedule();
    for (let i = 0; i < 7; i++) {
      const slot = s.scheduleJson?.[String(i)];
      next[String(i)] =
        slot?.start && slot?.end
          ? { start: slot.start, end: slot.end }
          : null;
    }
    setSchedule(next);
    setEffectiveFrom(s.effectiveFrom ?? "");
    setEffectiveTo(s.effectiveTo ?? "");
    setIsActive(s.isActive !== false);
    setError(null);
    setDialogOpen(true);
  }

  function openMembers(shift: LaborUnitShiftView) {
    setSelectedShift(shift);
    setMembersOpen(true);
    setAddEmployeeId(null);
    startTransition(async () => {
      const res = await listLaborUnitShiftMembersAction(shift.id);
      if (!res.success) {
        setError(res.message);
        return;
      }
      setMembers(res.data.filter((m) => m.status === "ACTIVE"));
    });
  }

  function canSaveShift(): boolean {
    if (!name.trim() || !laborUnitId) return false;
    if (!hasAnySlot(schedule)) return false;
    if (effectiveFrom && effectiveTo && effectiveTo < effectiveFrom) return false;
    return true;
  }

  function saveShift() {
    if (!canSaveShift() || !laborUnitId) {
      setError(
        !hasAnySlot(schedule)
          ? "Defina al menos un día con horario"
          : effectiveTo && effectiveFrom && effectiveTo < effectiveFrom
            ? "La vigencia hasta no puede ser anterior al desde"
            : "Complete los datos del turno",
      );
      return;
    }
    setError(null);
    const body = {
      laborUnitId,
      name: name.trim(),
      scheduleJson: schedule,
      effectiveFrom: effectiveFrom.trim() || null,
      effectiveTo: effectiveTo.trim() || null,
      isActive,
    };
    startTransition(async () => {
      const res = editing
        ? await updateLaborUnitShiftAction(editing.id, body)
        : await createLaborUnitShiftAction(body);
      if (!res.success) {
        setError(res.message);
        return;
      }
      setDialogOpen(false);
      reloadShifts(laborUnitId);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4" data-test-id="labor-unit-shifts-panel">
      {error ? <Alert variant="error">{error}</Alert> : null}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <Select
            label="Unidad laboral"
            value={laborUnitId}
            onChange={(id) => {
              const next = id != null ? String(id) : null;
              setLaborUnitId(next);
              reloadShifts(next);
            }}
            options={units.map((u) => ({
              id: u.id,
              label: `${u.code} · ${u.name}`,
            }))}
            alwaysShowLabel
          />
        </div>
        <Button
          variant="primary"
          disabled={!laborUnitId || pending}
          onClick={openCreate}
        >
          Nuevo turno
        </Button>
      </div>

      {shifts.length === 0 ? (
        <p
          className="py-12 text-center text-sm text-muted-foreground"
          data-test-id="labor-unit-shifts-empty"
        >
          No hay turnos en esta unidad laboral.
        </p>
      ) : (
        <div
          className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4"
          data-test-id="labor-unit-shifts-grid"
        >
          {shifts.map((s) => {
            const lines = scheduleLines(s.scheduleJson);
            return (
              <Card
                key={s.id}
                fillHeight
                data-test-id={`labor-unit-shift-card-${s.id}`}
                title={s.name}
                subtitle={s.code}
                headerEnd={
                  <Badge variant={s.isActive !== false ? "success" : "secondary"}>
                    {s.isActive !== false ? "Activo" : "Inactivo"}
                  </Badge>
                }
                content={
                  <div className="space-y-2 text-sm">
                    {lines.length > 0 ? (
                      <ul className="space-y-0.5 text-muted-foreground">
                        {lines.map((line) => (
                          <li
                            key={line}
                            className="tabular-nums"
                          >
                            {line}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground">Sin horario</p>
                    )}
                    {(s.effectiveFrom || s.effectiveTo) && (
                      <p className="text-xs text-muted-foreground">
                        Vigencia: {s.effectiveFrom || "…"} →{" "}
                        {s.effectiveTo || "…"}
                      </p>
                    )}
                  </div>
                }
                actions={[
                  {
                    id: "edit",
                    icon: "Pencil",
                    ariaLabel: "Editar turno",
                    onClick: () => openEdit(s),
                    "data-test-id": `labor-unit-shift-edit-${s.id}`,
                  },
                  {
                    id: "members",
                    icon: "Users",
                    ariaLabel: "Miembros del turno",
                    onClick: () => openMembers(s),
                    "data-test-id": `labor-unit-shift-members-${s.id}`,
                  },
                ]}
              />
            );
          })}
        </div>
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? `Editar turno — ${editing.code}` : "Nuevo turno UL"}
        size="lg"
        scroll="paper"
        maxHeight="min(90vh, 720px)"
        actions={
          <>
            <Button variant="outlined" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              disabled={pending || !canSaveShift()}
              onClick={saveShift}
            >
              {editing ? "Guardar" : "Crear"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <TextField
            label="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Sala mañana"
          />
          <div className="space-y-2 rounded-md border border-dashed p-3">
            <p className="text-sm font-medium">Horario por día</p>
            {WEEKDAY_LABELS.map((label, dayIdx) => {
              const day = String(dayIdx);
              const slot = schedule[day];
              return (
                <div
                  key={day}
                  className="grid grid-cols-[auto_1fr_1fr_auto] items-end gap-2"
                >
                  <span className="w-10 pb-2 text-sm text-muted-foreground">
                    {label}
                  </span>
                  <TextField
                    label="Inicio"
                    type="time"
                    value={slot?.start ?? ""}
                    onChange={(e) =>
                      setSchedule((prev) => ({
                        ...prev,
                        [day]: {
                          start: e.target.value,
                          end: prev[day]?.end ?? "18:00",
                        },
                      }))
                    }
                  />
                  <TextField
                    label="Fin"
                    type="time"
                    value={slot?.end ?? ""}
                    onChange={(e) =>
                      setSchedule((prev) => ({
                        ...prev,
                        [day]: {
                          start: prev[day]?.start ?? "09:00",
                          end: e.target.value,
                        },
                      }))
                    }
                  />
                  <Button
                    variant="outlined"
                    size="sm"
                    type="button"
                    onClick={() =>
                      setSchedule((prev) => ({
                        ...prev,
                        [day]:
                          prev[day]?.start && prev[day]?.end
                            ? null
                            : { start: "09:00", end: "18:00" },
                      }))
                    }
                  >
                    {slot?.start && slot?.end ? "Quitar" : "Activar"}
                  </Button>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TextField
              label="Vigencia desde"
              type="date"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
            />
            <TextField
              label="Vigencia hasta"
              type="date"
              value={effectiveTo}
              onChange={(e) => setEffectiveTo(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={isActive} onChange={setIsActive} />
            <span className="text-sm">Activo</span>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={membersOpen}
        onClose={() => setMembersOpen(false)}
        title={
          selectedShift
            ? `Miembros — ${selectedShift.name}`
            : "Miembros"
        }
        size="md"
        actions={
          <Button variant="primary" onClick={() => setMembersOpen(false)}>
            Cerrar
          </Button>
        }
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[200px] flex-1">
              <Select
                label="Empleado de la UL"
                value={addEmployeeId}
                onChange={(id) =>
                  setAddEmployeeId(id != null ? String(id) : null)
                }
                options={unitEmployees.map((e) => ({
                  id: e.id,
                  label: e.label,
                }))}
                alwaysShowLabel
              />
            </div>
            <Button
              variant="primary"
              size="sm"
              disabled={!addEmployeeId || !selectedShift || pending}
              onClick={() => {
                if (!selectedShift || !addEmployeeId) return;
                startTransition(async () => {
                  const res = await addLaborUnitShiftMemberAction(
                    selectedShift.id,
                    addEmployeeId,
                  );
                  if (!res.success) {
                    setError(res.message);
                    return;
                  }
                  openMembers(selectedShift);
                });
              }}
            >
              Asignar
            </Button>
          </div>
          <ul className="divide-y divide-border rounded-md border border-border">
            {members.length === 0 ? (
              <li className="px-3 py-4 text-sm text-muted-foreground">
                Sin miembros activos.
              </li>
            ) : (
              members.map((m) => {
                const emp = employees.find((e) => e.id === m.employeeId);
                return (
                  <li
                    key={m.id}
                    className="flex items-center justify-between gap-2 px-3 py-2"
                  >
                    <span className="text-sm">
                      {emp?.label ?? m.employeeId}
                    </span>
                    <Button
                      variant="outlined"
                      size="sm"
                      disabled={pending}
                      onClick={() => {
                        if (!selectedShift) return;
                        startTransition(async () => {
                          const res = await removeLaborUnitShiftMemberAction(
                            selectedShift.id,
                            m.employeeId,
                          );
                          if (!res.success) {
                            setError(res.message);
                            return;
                          }
                          openMembers(selectedShift);
                        });
                      }}
                    >
                      Quitar
                    </Button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </Dialog>
    </div>
  );
}
