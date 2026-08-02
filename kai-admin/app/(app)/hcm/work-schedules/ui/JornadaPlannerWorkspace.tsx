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
  getJornadaPeriodAction,
  loadJornadaWeekFromShiftsAction,
  saveJornadaWeekAction,
} from "@/features/hr-jornada/actions/jornada.action";
import { listLaborUnitShiftsAction } from "@/features/hr-labor-unit-shifts/actions/labor-unit-shift.action";
import type { LaborUnitShiftView } from "@/features/hr-labor-unit-shifts/types/labor-unit-shift.types";
import type {
  ScheduleFinding,
  ShiftExceptionView,
  WeekAssignmentInput,
  WeekPlanView,
} from "@/features/hr-jornada/types/jornada.types";
import { EXCEPTION_TYPE_LABELS } from "@/features/hr-jornada/types/jornada.types";
import { HCM_WORK_SCHEDULES } from "@/navigation/hcm-routes";
import {
  defaultExpandedDay,
  JornadaCoverageMural,
} from "./JornadaCoverageMural";
import {
  personAccentStyle,
  shiftCellFillStyle,
} from "@/features/hr-jornada/ui/jornada-planner-tones";

type Props = {
  initialPlan: WeekPlanView;
  laborUnits: Array<{ id: string; name: string; code?: string }>;
};

type DraftCell = {
  employeeId: string;
  workDate: string;
  startTime: string;
  endTime: string;
  /** Fixed shift band for coverage mural (unchanged by jornada resize). */
  shiftBandStartTime?: string | null;
  shiftBandEndTime?: string | null;
  plannedOvertimeMinutes: number;
  isNight: boolean;
  isNightOutgoing: boolean;
  notes: string;
  laborUnitShiftId?: string | null;
  laborUnitShiftName?: string | null;
  employeeDisplayName?: string | null;
};

/** Monday=0 … Sunday=6 — matches UL shift scheduleJson keys. */
function weekdayIndexMon0(isoDate: string): number {
  const d = new Date(`${isoDate}T12:00:00Z`);
  const js = d.getUTCDay();
  return js === 0 ? 6 : js - 1;
}

function slotFromMeta(
  meta: { scheduleJson?: Record<string, { start?: string; end?: string } | null> | null } | undefined,
  workDate: string,
): { start: string; end: string } | null {
  const slot = meta?.scheduleJson?.[String(weekdayIndexMon0(workDate))];
  if (slot?.start && slot?.end) return { start: slot.start, end: slot.end };
  return null;
}

function parseHm(hm: string): number {
  const [h, m] = hm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function durationMinutesHm(startTime: string, endTime: string): number {
  const s = parseHm(startTime);
  let e = parseHm(endTime);
  if (e <= s) e += 24 * 60;
  return e - s;
}

/** HE live vs banda UL cuando hay baseline claro (exceso de duración). */
function liveOvertimeFromBand(
  startTime: string,
  endTime: string,
  bandStart: string,
  bandEnd: string,
  maxDailyOvertimeMinutes: number,
): number {
  const excess = Math.max(
    0,
    durationMinutesHm(startTime, endTime) - durationMinutesHm(bandStart, bandEnd),
  );
  if (excess <= 0) return 0;
  return Math.min(excess, Math.max(0, maxDailyOvertimeMinutes));
}

function monthStartFromIso(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

/** Meses calendario que toca un rango inclusive. */
function monthsTouchingRange(from: string, to: string): string[] {
  const out: string[] = [];
  let cursor = monthStartFromIso(from);
  const endMonth = monthStartFromIso(to);
  while (cursor <= endMonth) {
    out.push(cursor);
    const [y, m] = cursor.split("-").map(Number);
    const next = m === 12 ? { y: y + 1, m: 1 } : { y, m: m + 1 };
    cursor = `${next.y}-${String(next.m).padStart(2, "0")}-01`;
  }
  return out;
}

function toSegments(startMin: number, endMin: number): [number, number][] {
  if (endMin > startMin) return [[startMin, endMin]];
  if (endMin === startMin) return [];
  return [
    [startMin, 24 * 60],
    [0, endMin],
  ];
}

function segmentsOverlap(
  a: [number, number][],
  b: [number, number][],
): boolean {
  for (const [as, ae] of a) {
    for (const [bs, be] of b) {
      if (as < be && bs < ae) return true;
    }
  }
  return false;
}

/** Clasifica franja nocturna (alineado a night-window.util del core). */
function classifyNightSlot(
  startTime: string,
  endTime: string,
  nightStart: string,
  nightEnd: string,
): { isNight: boolean; isNightOutgoing: boolean } {
  const start = parseHm(startTime);
  const end = parseHm(endTime);
  const nStart = parseHm(nightStart);
  const nEnd = parseHm(nightEnd);
  const isNight = segmentsOverlap(
    toSegments(start, end),
    toSegments(nStart, nEnd),
  );
  const endsInMorningWindow = end > 0 && end <= nEnd;
  const crossesMidnight = end <= start;
  const isNightOutgoing =
    isNight && (crossesMidnight || endsInMorningWindow) && endsInMorningWindow;
  return { isNight, isNightOutgoing };
}

function isShiftEffectiveOn(
  shift: Pick<LaborUnitShiftView, "effectiveFrom" | "effectiveTo">,
  workDate: string,
): boolean {
  if (shift.effectiveFrom && workDate < shift.effectiveFrom) return false;
  if (shift.effectiveTo && workDate > shift.effectiveTo) return false;
  return true;
}

function severityBadge(sev: string) {
  if (sev === "CRITICAL") return <Badge variant="error">Crítico</Badge>;
  if (sev === "WARNING") return <Badge variant="warning">Alerta</Badge>;
  return <Badge variant="success">OK</Badge>;
}

function planToDrafts(
  plan: WeekPlanView,
  shiftNameById?: Map<string, string>,
): DraftCell[] {
  const nameById = new Map(
    plan.employees.map((e) => [e.id, e.displayName] as const),
  );
  const out: DraftCell[] = [];
  for (const inst of plan.instances) {
    for (const a of inst.assignments) {
      const shiftId = inst.laborUnitShiftId ?? null;
      out.push({
        employeeId: a.employeeId,
        workDate: inst.workDate,
        startTime: a.startTime?.trim() || inst.startTime,
        endTime: a.endTime?.trim() || inst.endTime,
        shiftBandStartTime: inst.startTime,
        shiftBandEndTime: inst.endTime,
        plannedOvertimeMinutes: a.plannedOvertimeMinutes,
        isNight: inst.isNight,
        isNightOutgoing: inst.isNightOutgoing,
        notes: a.notes ?? "",
        laborUnitShiftId: shiftId,
        laborUnitShiftName: shiftId
          ? (shiftNameById?.get(shiftId) ?? null)
          : null,
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
    shiftBandStartTime: d.shiftBandStartTime ?? d.startTime,
    shiftBandEndTime: d.shiftBandEndTime ?? d.endTime,
    plannedOvertimeMinutes: d.plannedOvertimeMinutes,
    isNight: d.isNight,
    isNightOutgoing: d.isNightOutgoing,
    notes: d.notes || null,
    laborUnitShiftId: d.laborUnitShiftId ?? null,
  }));
}

function personDayKey(employeeId: string, workDate: string): string {
  return `${employeeId}|${workDate}`;
}

function formatExceptionItem(ex: ShiftExceptionView): string {
  const label = EXCEPTION_TYPE_LABELS[ex.type] ?? ex.type;
  return ex.minutes > 0 ? `${label} ${ex.minutes}m` : label;
}

function formatExceptionLine(excs: ShiftExceptionView[]): string {
  if (!excs.length) return "";
  return excs.map(formatExceptionItem).join(" · ");
}

/** Clave employeeId|workDate → línea compacta de excepciones. */
function exceptionLinesByPersonDay(
  exceptions: ShiftExceptionView[],
): Map<string, string> {
  const grouped = new Map<string, ShiftExceptionView[]>();
  for (const ex of exceptions) {
    const key = personDayKey(ex.employeeId, ex.workDate);
    const list = grouped.get(key) ?? [];
    list.push(ex);
    grouped.set(key, list);
  }
  const lines = new Map<string, string>();
  for (const [key, list] of grouped) {
    const line = formatExceptionLine(list);
    if (line) lines.set(key, line);
  }
  return lines;
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
  const [ulShifts, setUlShifts] = useState<LaborUnitShiftView[]>([]);
  const [closedMonths, setClosedMonths] = useState<string[]>([]);
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
  const periodLocked = closedMonths.length > 0;

  const shiftNameById = useMemo(
    () => new Map(ulShifts.map((s) => [s.id, s.name] as const)),
    [ulShifts],
  );

  const planSyncKey = useMemo(
    () =>
      [
        weekStart,
        laborUnitId,
        initialPlan.employees.map((e) => `${e.id}:${e.displayName}`).join(","),
        initialPlan.instances
          .map((i) => `${i.id}:${i.assignments.length}`)
          .join(","),
        initialPlan.exceptions.map((e) => e.id).join(","),
      ].join("|"),
    [
      weekStart,
      laborUnitId,
      initialPlan.employees,
      initialPlan.instances,
      initialPlan.exceptions,
    ],
  );

  const exceptionLines = useMemo(
    () => exceptionLinesByPersonDay(plan.exceptions ?? []),
    [plan.exceptions],
  );

  const editorDayShifts = useMemo(() => {
    if (!editor) return [] as LaborUnitShiftView[];
    return ulShifts.filter(
      (s) =>
        s.isActive &&
        isShiftEffectiveOn(s, editor.workDate) &&
        !!slotFromMeta(s, editor.workDate),
    );
  }, [editor, ulShifts]);

  useEffect(() => {
    if (!days.includes(expandedDay)) {
      setExpandedDay(defaultExpandedDay(days));
    }
  }, [days, expandedDay]);

  /** Períodos CLOSED que intersectan la semana (bloquean guardar). */
  useEffect(() => {
    let cancelled = false;
    const months = monthsTouchingRange(weekStart, weekEnd);
    void (async () => {
      const closed: string[] = [];
      for (const start of months) {
        const res = await getJornadaPeriodAction(start);
        if (res.success && res.data?.status === "CLOSED") {
          closed.push(start.slice(0, 7));
        }
      }
      if (!cancelled) setClosedMonths(closed);
    })();
    return () => {
      cancelled = true;
    };
  }, [weekStart, weekEnd]);

  /** Catálogo de turnos UL para la unidad seleccionada. */
  useEffect(() => {
    if (!laborUnitId) {
      setUlShifts([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const res = await listLaborUnitShiftsAction(laborUnitId);
      if (cancelled) return;
      if (!res.success) {
        setUlShifts([]);
        return;
      }
      setUlShifts(res.data.filter((s) => s.isActive));
    })();
    return () => {
      cancelled = true;
    };
  }, [laborUnitId]);

  /** Enriquecer nombres de turno cuando llega el catálogo UL. */
  useEffect(() => {
    if (!shiftNameById.size) return;
    setDrafts((prev) => {
      let changed = false;
      const next = prev.map((d) => {
        if (!d.laborUnitShiftId) return d;
        const name = shiftNameById.get(d.laborUnitShiftId) ?? null;
        if (name === d.laborUnitShiftName) return d;
        changed = true;
        return { ...d, laborUnitShiftName: name };
      });
      return changed ? next : prev;
    });
  }, [shiftNameById]);

  /**
   * Sync server plan; if the week has no saved assignments, auto-load from turnos UL.
   */
  useEffect(() => {
    setPlan(initialPlan);
    setFindings(initialPlan.findings);
    setWorst(initialPlan.worstSeverity);

    const saved = planToDrafts(initialPlan, shiftNameById);
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
          const bandStart =
            a.shiftBandStartTime?.trim() ||
            slotFromMeta(meta, a.workDate)?.start ||
            a.startTime;
          const bandEnd =
            a.shiftBandEndTime?.trim() ||
            slotFromMeta(meta, a.workDate)?.end ||
            a.endTime;
          return {
            employeeId: a.employeeId,
            workDate: a.workDate,
            startTime: a.startTime,
            endTime: a.endTime,
            shiftBandStartTime: bandStart,
            shiftBandEndTime: bandEnd,
            plannedOvertimeMinutes: a.plannedOvertimeMinutes ?? 0,
            isNight: a.isNight ?? false,
            isNightOutgoing: a.isNightOutgoing ?? false,
            notes: a.notes ?? "",
            laborUnitShiftId: a.laborUnitShiftId ?? null,
            laborUnitShiftName:
              meta?.name ??
              (a.laborUnitShiftId
                ? (shiftNameById.get(a.laborUnitShiftId) ?? null)
                : null),
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
      setDrafts(planToDrafts(res.data, shiftNameById));
      setFindings(res.data.findings);
      setWorst(res.data.worstSeverity);
      setOverrideOpen(false);
      setOverrideReason("");
      router.refresh();
    });
  }

  function onSaveClick() {
    if (periodLocked) return;
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
          <div className="pb-1">
            <div
              className="flex items-center gap-0.5 rounded-lg border border-border p-0.5"
              role="group"
              aria-label="Modo de vista"
              data-test-id="jornada-view-mode"
            >
              <IconButton
                icon="Columns3"
                variant={viewMode === "coverage" ? "primary" : "action"}
                size="sm"
                ariaLabel="Vista mural por turno"
                title="Mural por turno"
                onClick={() => setViewMode("coverage")}
                data-test-id="jornada-view-coverage"
              />
              <IconButton
                icon="Table"
                variant={viewMode === "person" ? "primary" : "action"}
                size="sm"
                ariaLabel="Vista por persona"
                title="Por persona"
                onClick={() => setViewMode("person")}
                data-test-id="jornada-view-person"
              />
            </div>
          </div>
        ) : null}
        <div className="ml-auto flex flex-wrap items-center gap-2 pb-1">
          <IconButton
            icon="Save"
            variant="primary"
            size="sm"
            ariaLabel={pending ? "Guardando plan" : "Guardar plan"}
            title={
              periodLocked
                ? `Período cerrado (${closedMonths.join(", ")})`
                : pending
                  ? "Guardando…"
                  : "Guardar plan"
            }
            disabled={pending || !laborUnitId || periodLocked}
            isLoading={pending}
            onClick={onSaveClick}
            data-test-id="jornada-save-plan"
          />
        </div>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}
      {notice ? <Alert variant="warning">{notice}</Alert> : null}
      {periodLocked ? (
        <Alert variant="warning" data-test-id="jornada-period-closed">
          El período {closedMonths.join(", ")} está cerrado. Reabrilo en Reportes
          HCM para editar esta semana.
        </Alert>
      ) : null}

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
          drafts={drafts.map((d) => ({
            employeeId: d.employeeId,
            workDate: d.workDate,
            startTime: d.startTime,
            endTime: d.endTime,
            shiftBandStartTime: d.shiftBandStartTime ?? d.startTime,
            shiftBandEndTime: d.shiftBandEndTime ?? d.endTime,
            laborUnitShiftId: d.laborUnitShiftId,
            laborUnitShiftName: d.laborUnitShiftName,
            employeeDisplayName: d.employeeDisplayName,
            plannedOvertimeMinutes: d.plannedOvertimeMinutes,
          }))}
          employees={employees}
          holidaySet={holidaySet}
          expandedDay={expandedDay}
          exceptionLinesByKey={exceptionLines}
          onExpandDay={setExpandedDay}
          onUpdateAssignment={({ employeeId, workDate, startTime, endTime }) => {
            const maxOt = plan.config?.maxDailyOvertimeMinutes ?? 120;
            setDrafts((prev) =>
              prev.map((d) => {
                if (d.employeeId !== employeeId || d.workDate !== workDate) {
                  return d;
                }
                const bandStart = d.shiftBandStartTime ?? d.startTime;
                const bandEnd = d.shiftBandEndTime ?? d.endTime;
                const plannedOvertimeMinutes = liveOvertimeFromBand(
                  startTime,
                  endTime,
                  bandStart,
                  bandEnd,
                  maxOt,
                );
                return { ...d, startTime, endTime, plannedOvertimeMinutes };
              }),
            );
          }}
          onRemoveAssignment={({ employeeId, workDate }) => {
            removeDraft(employeeId, workDate);
          }}
          onAddException={({ employeeId, workDate }) => {
            setExceptionOpen({ employeeId, workDate });
          }}
        />
      ) : null}

      {laborUnitId && viewMode === "person" ? (
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="min-w-[960px] w-full border-collapse text-sm">
          <thead>
            <tr className="bg-neutral text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="sticky left-0 z-10 bg-neutral px-3 py-2">Empleado</th>
              {days.map((d) => (
                <th
                  key={d}
                  className={[
                    "px-2 py-2 font-medium",
                    holidaySet.has(d) ? "bg-warning/10" : "",
                  ].join(" ")}
                >
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
                  const excLine = exceptionLines.get(personDayKey(emp.id, d));
                  return (
                    <td key={d} className="px-1 py-1 align-top">
                      {cell ? (
                        <button
                          type="button"
                          className="w-full rounded border px-2 py-1 text-left hover:border-primary"
                          style={{
                            ...shiftCellFillStyle(cell.laborUnitShiftId),
                            borderLeftWidth: 3,
                            borderLeftStyle: "solid",
                            borderLeftColor:
                              personAccentStyle(emp.id).borderLeftColor,
                          }}
                          onClick={() => setEditor({ ...cell })}
                        >
                          {cell.laborUnitShiftName ? (
                            <div
                              className="truncate text-xs font-medium text-foreground"
                              title={cell.laborUnitShiftName}
                            >
                              {cell.laborUnitShiftName}
                            </div>
                          ) : null}
                          <div
                            className={[
                              "tabular-nums",
                              cell.laborUnitShiftName
                                ? "text-xs text-muted-foreground"
                                : "font-medium",
                            ].join(" ")}
                          >
                            {cell.startTime}–{cell.endTime}
                          </div>
                          {cell.plannedOvertimeMinutes > 0 ? (
                            <div className="text-xs text-warning">
                              HE {cell.plannedOvertimeMinutes}m
                            </div>
                          ) : null}
                          {excLine ? (
                            <div
                              className="truncate text-xs text-warning"
                              title={excLine}
                            >
                              {excLine}
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
                              startTime: "",
                              endTime: "",
                              shiftBandStartTime: null,
                              shiftBandEndTime: null,
                              plannedOvertimeMinutes: 0,
                              isNight: false,
                              isNightOutgoing: false,
                              notes: "",
                              laborUnitShiftId: null,
                              laborUnitShiftName: null,
                              employeeDisplayName: emp.displayName,
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
        actions={
          <>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outlined"
                onClick={() => setEditor(null)}
              >
                Cancelar
              </Button>
              {editor &&
              cellDraft(editor.employeeId, editor.workDate) ? (
                <Button
                  variant="outlined"
                  onClick={() => {
                    removeDraft(editor.employeeId, editor.workDate);
                    setEditor(null);
                  }}
                >
                  Quitar
                </Button>
              ) : null}
            </div>
            <Button
              variant="primary"
              disabled={
                !editor?.laborUnitShiftId ||
                !editor.startTime ||
                !editor.endTime ||
                editorDayShifts.length === 0
              }
              onClick={() => {
                if (
                  !editor?.laborUnitShiftId ||
                  !editor.startTime ||
                  !editor.endTime
                ) {
                  return;
                }
                upsertDraft(editor);
                setEditor(null);
              }}
            >
              Guardar
            </Button>
          </>
        }
      >
        {editor ? (
          <div className="space-y-3">
            {editorDayShifts.length === 0 ? (
              <Alert variant="info">
                No hay turnos UL activos con horario para este día. Configúralos
                en Turnos UL.
              </Alert>
            ) : (
              <Select
                label="Turno"
                value={editor.laborUnitShiftId || null}
                onChange={(id) => {
                  const shiftId = id != null ? String(id) : "";
                  const shift = editorDayShifts.find((s) => s.id === shiftId);
                  if (!shift) return;
                  const slot = slotFromMeta(shift, editor.workDate);
                  if (!slot) return;
                  const night = classifyNightSlot(
                    slot.start,
                    slot.end,
                    plan.config?.nightStart ?? "21:00",
                    plan.config?.nightEnd ?? "07:00",
                  );
                  setEditor({
                    ...editor,
                    laborUnitShiftId: shift.id,
                    laborUnitShiftName: shift.name,
                    startTime: slot.start,
                    endTime: slot.end,
                    shiftBandStartTime: slot.start,
                    shiftBandEndTime: slot.end,
                    isNight: night.isNight,
                    isNightOutgoing: night.isNightOutgoing,
                  });
                }}
                options={editorDayShifts.map((s) => {
                  const slot = slotFromMeta(s, editor.workDate);
                  const range = slot
                    ? `${slot.start}–${slot.end}`
                    : "";
                  return {
                    id: s.id,
                    label: range ? `${s.name} (${range})` : s.name,
                  };
                })}
                alwaysShowLabel
                data-test-id="jornada-assign-ul-shift"
              />
            )}
            {editor.startTime && editor.endTime ? (
              <p className="text-sm text-muted-foreground">
                Horario:{" "}
                <span className="font-medium tabular-nums text-foreground">
                  {editor.startTime}–{editor.endTime}
                </span>
              </p>
            ) : null}
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
        actions={
          <>
            <Button
              variant="outlined"
              disabled={pending}
              onClick={() => setExceptionOpen(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              disabled={pending || !exceptionOpen}
              onClick={() => {
                if (!exceptionOpen) return;
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
                  if (res.data) {
                    setPlan((prev) => ({
                      ...prev,
                      exceptions: [...(prev.exceptions ?? []), res.data],
                    }));
                  }
                  setExceptionOpen(null);
                  router.refresh();
                });
              }}
            >
              Guardar
            </Button>
          </>
        }
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
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
