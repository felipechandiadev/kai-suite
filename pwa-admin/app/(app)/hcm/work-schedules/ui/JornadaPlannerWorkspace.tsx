"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  addDaysIso,
  Alert,
  Badge,
  Button,
  Dialog,
  getTodayIso,
  getWeekStart,
  IconButton,
  TextField,
  Select,
} from "@kai/ui";
import {
  createJornadaExceptionAction,
  loadJornadaWeekFromShiftsAction,
  saveJornadaWeekAction,
} from "@/features/hr-jornada/actions/jornada.action";
import type {
  ScheduleFinding,
  WeekAssignmentInput,
  WeekPlanView,
} from "@/features/hr-jornada/types/jornada.types";
import { EXCEPTION_TYPE_LABELS } from "@/features/hr-jornada/types/jornada.types";
import { HCM_WORK_SCHEDULES } from "@/navigation/hcm-routes";
import {
  defaultExpandedDay,
  JornadaCoverageMural,
} from "./JornadaCoverageMural";

type Props = {
  initialPlan: WeekPlanView;
  laborUnits: Array<{ id: string; name: string; code?: string }>;
};

type DraftCell = {
  employeeId: string;
  workDate: string;
  startTime: string;
  endTime: string;
  plannedOvertimeMinutes: number;
  isNight: boolean;
  isNightOutgoing: boolean;
  notes: string;
  laborUnitShiftId?: string | null;
  laborUnitShiftName?: string | null;
  employeeDisplayName?: string | null;
};

function severityBadge(sev: string) {
  if (sev === "CRITICAL") return <Badge variant="error">Crítico</Badge>;
  if (sev === "WARNING") return <Badge variant="warning">Alerta</Badge>;
  return <Badge variant="success">OK</Badge>;
}

function planToDrafts(plan: WeekPlanView): DraftCell[] {
  const nameById = new Map(
    plan.employees.map((e) => [e.id, e.displayName] as const),
  );
  const out: DraftCell[] = [];
  for (const inst of plan.instances) {
    for (const a of inst.assignments) {
      out.push({
        employeeId: a.employeeId,
        workDate: inst.workDate,
        startTime: inst.startTime,
        endTime: inst.endTime,
        plannedOvertimeMinutes: a.plannedOvertimeMinutes,
        isNight: inst.isNight,
        isNightOutgoing: inst.isNightOutgoing,
        notes: a.notes ?? "",
        laborUnitShiftId: inst.laborUnitShiftId ?? null,
        employeeDisplayName: nameById.get(a.employeeId) ?? null,
      });
    }
  }
  return out;
}

function draftsToAssignments(drafts: DraftCell[]): WeekAssignmentInput[] {
  return drafts.map((d) => ({
    employeeId: d.employeeId,
    workDate: d.workDate,
    startTime: d.startTime,
    endTime: d.endTime,
    plannedOvertimeMinutes: d.plannedOvertimeMinutes,
    isNight: d.isNight,
    isNightOutgoing: d.isNightOutgoing,
    notes: d.notes || null,
    laborUnitShiftId: d.laborUnitShiftId ?? null,
  }));
}

export function JornadaPlannerWorkspace({
  initialPlan,
  laborUnits = [],
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const weekStart =
    searchParams.get("week") ?? initialPlan.weekStart ?? getWeekStart(getTodayIso());
  const laborUnitId = searchParams.get("laborUnitId") ?? "";

  const [plan, setPlan] = useState(initialPlan);
  const [drafts, setDrafts] = useState(() => planToDrafts(initialPlan));
  const [findings, setFindings] = useState<ScheduleFinding[]>(initialPlan.findings);
  const [worst, setWorst] = useState(initialPlan.worstSeverity);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [editor, setEditor] = useState<DraftCell | null>(null);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [exceptionOpen, setExceptionOpen] = useState<{
    employeeId: string;
    workDate: string;
  } | null>(null);
  const [exceptionType, setExceptionType] = useState("LATE");
  const [exceptionMinutes, setExceptionMinutes] = useState("30");
  const [viewMode, setViewMode] = useState<"coverage" | "person">("coverage");
  const [expandedDay, setExpandedDay] = useState(() =>
    defaultExpandedDay(
      Array.from({ length: 7 }, (_, i) => addDaysIso(weekStart, i)),
    ),
  );
  const loadGen = useRef(0);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDaysIso(weekStart, i)),
    [weekStart],
  );
  const weekEnd = days[6] ?? addDaysIso(weekStart, 6);

  const planSyncKey = useMemo(
    () =>
      [
        weekStart,
        laborUnitId,
        initialPlan.employees.map((e) => `${e.id}:${e.displayName}`).join(","),
        initialPlan.instances
          .map((i) => `${i.id}:${i.assignments.length}`)
          .join(","),
      ].join("|"),
    [weekStart, laborUnitId, initialPlan.employees, initialPlan.instances],
  );

  useEffect(() => {
    if (!days.includes(expandedDay)) {
      setExpandedDay(defaultExpandedDay(days));
    }
  }, [days, expandedDay]);

  /**
   * Sync server plan; if the week has no saved assignments, auto-load from turnos UL.
   */
  useEffect(() => {
    setPlan(initialPlan);
    setFindings(initialPlan.findings);
    setWorst(initialPlan.worstSeverity);

    const saved = planToDrafts(initialPlan);
    if (saved.length > 0 || !laborUnitId) {
      setDrafts(saved);
      setError(null);
      setNotice(null);
      return;
    }

    const gen = ++loadGen.current;
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await loadJornadaWeekFromShiftsAction({
        weekStart,
        laborUnitId,
      });
      if (gen !== loadGen.current) return;
      if (!res.success) {
        setError(res.message);
        setDrafts([]);
        return;
      }
      if (res.data.employees?.length) {
        setPlan((prev) => ({
          ...prev,
          employees: res.data.employees,
          holidays: res.data.holidays ?? prev.holidays,
        }));
      }
      const loaded = res.data.loadedAssignments ?? [];
      const shiftMeta = res.data.laborUnitShifts ?? [];
      if (!loaded.length) {
        setDrafts([]);
        const msg = res.data.message;
        // Membership skips are expected; do not surface as a page alert.
        if (typeof msg === "string" && msg.includes("sin membresía a turno UL")) {
          setError(null);
          setNotice(null);
          return;
        }
        setError(msg ?? "No hay turnos activos para cargar en esta semana.");
        return;
      }
      setDrafts(
        loaded.map((a) => {
          const meta = shiftMeta.find((s) => s.id === a.laborUnitShiftId);
          const emp = res.data.employees?.find((e) => e.id === a.employeeId);
          return {
            employeeId: a.employeeId,
            workDate: a.workDate,
            startTime: a.startTime,
            endTime: a.endTime,
            plannedOvertimeMinutes: a.plannedOvertimeMinutes ?? 0,
            isNight: a.isNight ?? false,
            isNightOutgoing: a.isNightOutgoing ?? false,
            notes: a.notes ?? "",
            laborUnitShiftId: a.laborUnitShiftId ?? null,
            laborUnitShiftName: meta?.name ?? null,
            employeeDisplayName: emp?.displayName ?? null,
          };
        }),
      );
      setFindings(res.data.findings ?? []);
      setWorst(res.data.worstSeverity ?? "OK");
      setNotice(null);
      setError(null);
    });
    // planSyncKey captures week/UL + server roster/instances identity
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional sync key
  }, [planSyncKey]);

  const holidaySet = useMemo(
    () => new Set(plan.holidays.map((h) => h.date)),
    [plan.holidays],
  );

  const employees = laborUnitId ? plan.employees : [];

  function setWeek(next: string) {
    const q = new URLSearchParams(searchParams.toString());
    q.set("week", next);
    router.push(`${HCM_WORK_SCHEDULES}?${q.toString()}`);
  }

  function setLaborUnit(next: string) {
    const q = new URLSearchParams(searchParams.toString());
    if (next) q.set("laborUnitId", next);
    else q.delete("laborUnitId");
    router.push(`${HCM_WORK_SCHEDULES}?${q.toString()}`);
  }

  function cellDraft(employeeId: string, workDate: string) {
    return drafts.find((d) => d.employeeId === employeeId && d.workDate === workDate);
  }

  function upsertDraft(cell: DraftCell) {
    setDrafts((prev) => {
      const idx = prev.findIndex(
        (d) => d.employeeId === cell.employeeId && d.workDate === cell.workDate,
      );
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = cell;
        return next;
      }
      return [...prev, cell];
    });
  }

  function removeDraft(employeeId: string, workDate: string) {
    setDrafts((prev) =>
      prev.filter((d) => !(d.employeeId === employeeId && d.workDate === workDate)),
    );
  }

  function doSave(reason?: string | null) {
    setError(null);
    startTransition(async () => {
      const res = await saveJornadaWeekAction({
        weekStart,
        assignments: draftsToAssignments(drafts),
        overrideReason: reason ?? null,
        laborUnitId: laborUnitId || null,
      });
      if (!res.success) {
        setError(res.message);
        return;
      }
      setPlan(res.data);
      setDrafts(planToDrafts(res.data));
      setFindings(res.data.findings);
      setWorst(res.data.worstSeverity);
      setOverrideOpen(false);
      setOverrideReason("");
      router.refresh();
    });
  }

  function onSaveClick() {
    if (worst === "CRITICAL" || findings.some((f) => f.severity === "CRITICAL")) {
      // Local preview may be stale; still require reason if current findings have CRITICAL
      // Validate via save which enforces server-side
      setOverrideOpen(true);
      return;
    }
    doSave(null);
  }

  return (
    <div className="flex min-h-0 flex-col gap-3" data-test-id="jornada-planner">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1 sm:max-w-xs">
          <Select
            label="Unidad laboral"
            value={laborUnitId || null}
            onChange={(id) => setLaborUnit(id != null ? String(id) : "")}
            options={[
              { id: "", label: "Seleccionar…" },
              ...laborUnits.map((u) => ({
                id: u.id,
                label: u.code ? `${u.name} (${u.code})` : u.name,
              })),
            ]}
            alwaysShowLabel
            data-test-id="jornada-labor-unit-filter"
          />
        </div>
        <div
          className="flex items-center gap-1 pb-1"
          data-test-id="jornada-week-nav"
        >
          <IconButton
            icon="ChevronLeft"
            variant="outlined"
            size="sm"
            ariaLabel="Semana anterior"
            onClick={() => setWeek(addDaysIso(weekStart, -7))}
          />
          <span className="min-w-46 text-center text-sm tabular-nums text-foreground">
            {weekStart} → {weekEnd}
          </span>
          <IconButton
            icon="ChevronRight"
            variant="outlined"
            size="sm"
            ariaLabel="Semana siguiente"
            onClick={() => setWeek(addDaysIso(weekStart, 7))}
          />
        </div>
        {laborUnitId ? (
          <div
            className="flex items-center gap-2 pb-1"
            data-test-id="jornada-view-mode"
          >
            <Button
              variant={viewMode === "coverage" ? "primary" : "outlined"}
              size="sm"
              onClick={() => setViewMode("coverage")}
            >
              Cobertura
            </Button>
            <Button
              variant={viewMode === "person" ? "primary" : "outlined"}
              size="sm"
              onClick={() => setViewMode("person")}
            >
              Por persona
            </Button>
          </div>
        ) : null}
        <div className="ml-auto flex flex-wrap items-center gap-2 pb-1">
          <IconButton
            icon="Save"
            variant="primary"
            size="sm"
            ariaLabel={pending ? "Guardando plan" : "Guardar plan"}
            title={pending ? "Guardando…" : "Guardar plan"}
            disabled={pending || !laborUnitId}
            isLoading={pending}
            onClick={onSaveClick}
            data-test-id="jornada-save-plan"
          />
        </div>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}
      {notice ? <Alert variant="warning">{notice}</Alert> : null}

      {!laborUnitId ? (
        <Alert variant="info" data-test-id="jornada-labor-unit-required">
          Selecciona una unidad laboral para ver y planificar el mural. Los
          empleados sin unidad laboral no aparecen aquí: asígnala en la ficha
          del empleado.
        </Alert>
      ) : null}

      {findings.length > 0 ? (
        <div className="max-h-36 space-y-1 overflow-y-auto rounded-md border border-border bg-neutral/40 p-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Cumplimiento normativo
          </p>
          {findings.map((f, i) => (
            <div key={`${f.ruleCode}-${i}`} className="flex items-start gap-2 text-sm">
              {severityBadge(f.severity)}
              <span className="text-foreground">{f.message}</span>
            </div>
          ))}
        </div>
      ) : null}

      {laborUnitId && viewMode === "coverage" ? (
        <JornadaCoverageMural
          days={days}
          drafts={drafts}
          employees={employees}
          holidaySet={holidaySet}
          expandedDay={expandedDay}
          onExpandDay={setExpandedDay}
        />
      ) : null}

      {laborUnitId && viewMode === "person" ? (
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="min-w-[960px] w-full border-collapse text-sm">
          <thead>
            <tr className="bg-neutral text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="sticky left-0 z-10 bg-neutral px-3 py-2">Empleado</th>
              {days.map((d) => (
                <th key={d} className="px-2 py-2 font-medium">
                  <div>{d.slice(5)}</div>
                  {holidaySet.has(d) ? (
                    <Badge variant="warning">Festivo</Badge>
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {employees.map((emp) => (
              <tr key={emp.id}>
                <td className="sticky left-0 z-10 bg-background px-3 py-2 align-top">
                  <div className="font-medium text-foreground">{emp.displayName}</div>
                  <div className="text-xs text-muted-foreground">
                    Bolsa: {Math.round(emp.compensatoryBalanceMinutes / 60)}h
                  </div>
                </td>
                {days.map((d) => {
                  const cell = cellDraft(emp.id, d);
                  return (
                    <td key={d} className="px-1 py-1 align-top">
                      {cell ? (
                        <button
                          type="button"
                          className="w-full rounded border border-border bg-neutral/50 px-2 py-1 text-left hover:border-primary"
                          onClick={() => setEditor({ ...cell })}
                        >
                          <div className="font-medium">
                            {cell.startTime}–{cell.endTime}
                          </div>
                          {cell.plannedOvertimeMinutes > 0 ? (
                            <div className="text-xs text-warning">
                              HE {cell.plannedOvertimeMinutes}m
                            </div>
                          ) : null}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="w-full rounded border border-dashed border-border px-2 py-3 text-xs text-muted-foreground hover:border-primary"
                          onClick={() =>
                            setEditor({
                              employeeId: emp.id,
                              workDate: d,
                              startTime: "09:00",
                              endTime: "18:00",
                              plannedOvertimeMinutes: 0,
                              isNight: false,
                              isNightOutgoing: false,
                              notes: "",
                            })
                          }
                        >
                          + Turno
                        </button>
                      )}
                      <button
                        type="button"
                        className="mt-1 text-[10px] text-muted-foreground underline"
                        onClick={() =>
                          setExceptionOpen({ employeeId: emp.id, workDate: d })
                        }
                      >
                        Excepción
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
            {laborUnitId && employees.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-3 py-8 text-center text-muted-foreground"
                >
                  No hay empleados asignados a esta unidad laboral.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      ) : null}

      <Dialog
        open={!!editor}
        onClose={() => setEditor(null)}
        title="Asignar turno"
        size="sm"
      >
        {editor ? (
          <div className="space-y-3">
            <TextField
              label="Inicio"
              value={editor.startTime}
              onChange={(e) => setEditor({ ...editor, startTime: e.target.value })}
            />
            <TextField
              label="Fin"
              value={editor.endTime}
              onChange={(e) => setEditor({ ...editor, endTime: e.target.value })}
            />
            <TextField
              label="HE (minutos)"
              type="number"
              value={String(editor.plannedOvertimeMinutes)}
              onChange={(e) =>
                setEditor({
                  ...editor,
                  plannedOvertimeMinutes: Number(e.target.value) || 0,
                })
              }
            />
            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                onClick={() => {
                  upsertDraft(editor);
                  setEditor(null);
                }}
              >
                Aplicar
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  removeDraft(editor.employeeId, editor.workDate);
                  setEditor(null);
                }}
              >
                Quitar
              </Button>
            </div>
          </div>
        ) : null}
      </Dialog>

      <Dialog
        open={overrideOpen}
        onClose={() => setOverrideOpen(false)}
        title="Guardar con hallazgos críticos"
        size="md"
      >
        <div className="space-y-3">
          <Alert variant="warning">
            Hay incumplimientos CRITICAL. Indique el motivo para guardar de todos
            modos (queda auditado).
          </Alert>
          <ul className="list-inside list-disc text-sm text-muted-foreground">
            {findings
              .filter((f) => f.severity === "CRITICAL")
              .map((f, i) => (
                <li key={i}>{f.message}</li>
              ))}
          </ul>
          <TextField
            label="Motivo (obligatorio)"
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
          />
          <Button
            variant="primary"
            disabled={!overrideReason.trim() || pending}
            onClick={() => doSave(overrideReason.trim())}
          >
            Guardar de todos modos
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={!!exceptionOpen}
        onClose={() => setExceptionOpen(null)}
        title="Registrar excepción"
        size="sm"
      >
        {exceptionOpen ? (
          <div className="space-y-3">
            <Select
              label="Tipo"
              value={exceptionType}
              onChange={(id) => setExceptionType(String(id ?? "LATE"))}
              options={Object.entries(EXCEPTION_TYPE_LABELS).map(([id, label]) => ({
                id,
                label,
              }))}
            />
            <TextField
              label="Minutos"
              type="number"
              value={exceptionMinutes}
              onChange={(e) => setExceptionMinutes(e.target.value)}
            />
            <Button
              variant="primary"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  const res = await createJornadaExceptionAction({
                    employeeId: exceptionOpen.employeeId,
                    workDate: exceptionOpen.workDate,
                    type: exceptionType,
                    minutes: Number(exceptionMinutes) || 0,
                  });
                  if (!res.success) {
                    setError(res.message);
                    return;
                  }
                  setExceptionOpen(null);
                  router.refresh();
                });
              }}
            >
              Guardar excepción
            </Button>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
