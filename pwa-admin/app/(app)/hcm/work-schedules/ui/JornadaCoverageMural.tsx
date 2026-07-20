"use client";

import { useMemo } from "react";
import { getTodayIso } from "@kai/ui";
import type { JornadaEmployeeRow } from "@/features/hr-jornada/types/jornada.types";
import { WEEKDAY_LABELS } from "@/features/hr-jornada/types/employee-shift.types";

export type MuralDraft = {
  employeeId: string;
  workDate: string;
  startTime: string;
  endTime: string;
  laborUnitShiftId?: string | null;
  laborUnitShiftName?: string | null;
  employeeDisplayName?: string | null;
};

type ShiftBlock = {
  key: string;
  laborUnitShiftId: string | null;
  name: string;
  startTime: string;
  endTime: string;
  people: Array<{ id: string; label: string }>;
};

type Props = {
  days: string[];
  drafts: MuralDraft[];
  employees: JornadaEmployeeRow[];
  holidaySet: Set<string>;
  expandedDay: string;
  onExpandDay: (day: string) => void;
};

function groupDayBlocks(
  dayDrafts: MuralDraft[],
  empName: Map<string, string>,
): ShiftBlock[] {
  const map = new Map<string, ShiftBlock>();
  for (const d of dayDrafts) {
    const key = `${d.laborUnitShiftId ?? "adhoc"}|${d.startTime}|${d.endTime}`;
    let block = map.get(key);
    if (!block) {
      block = {
        key,
        laborUnitShiftId: d.laborUnitShiftId ?? null,
        name: d.laborUnitShiftName?.trim() || `Turno ${d.startTime}–${d.endTime}`,
        startTime: d.startTime,
        endTime: d.endTime,
        people: [],
      };
      map.set(key, block);
    }
    if (!block.people.some((p) => p.id === d.employeeId)) {
      const label =
        d.employeeDisplayName?.trim() ||
        empName.get(d.employeeId) ||
        "Funcionario";
      block.people.push({ id: d.employeeId, label });
    }
  }
  return [...map.values()].sort((a, b) =>
    a.startTime.localeCompare(b.startTime),
  );
}

export function JornadaCoverageMural({
  days,
  drafts,
  employees,
  holidaySet,
  expandedDay,
  onExpandDay,
}: Props) {
  const empName = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of employees) m.set(e.id, e.displayName);
    return m;
  }, [employees]);

  const byDay = useMemo(() => {
    const m = new Map<string, ShiftBlock[]>();
    for (const day of days) {
      m.set(
        day,
        groupDayBlocks(
          drafts.filter((d) => d.workDate === day),
          empName,
        ),
      );
    }
    return m;
  }, [days, drafts, empName]);

  const today = getTodayIso();

  return (
    <div
      className="flex min-h-[320px] gap-2 overflow-x-auto"
      data-test-id="jornada-coverage-mural"
    >
      {days.map((day, idx) => {
        const expanded = day === expandedDay;
        const blocks = byDay.get(day) ?? [];
        const isToday = day === today;
        const isHoliday = holidaySet.has(day);
        return (
          <button
            key={day}
            type="button"
            onClick={() => onExpandDay(day)}
            className={[
              "flex shrink-0 flex-col rounded-lg border text-left transition-all",
              expanded
                ? "min-w-[min(100%,280px)] flex-[2] border-foreground/30 bg-muted/20 p-3"
                : "w-[88px] flex-none border-border bg-background p-2 hover:bg-muted/30",
              isToday ? "ring-1 ring-foreground/20" : "",
            ].join(" ")}
            data-test-id={`jornada-mural-day-${day}`}
          >
            <div className="mb-2">
              <p className="text-xs font-semibold text-foreground">
                {WEEKDAY_LABELS[idx]}
                {isToday ? " · hoy" : ""}
              </p>
              <p className="text-[11px] text-muted-foreground">{day.slice(5)}</p>
              {isHoliday ? (
                <p className="text-[10px] text-warning">Festivo</p>
              ) : null}
            </div>

            {expanded ? (
              <div className="flex flex-1 flex-col gap-2">
                {blocks.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sin turnos</p>
                ) : (
                  blocks.map((b) => (
                    <div
                      key={b.key}
                      className="rounded-md border border-border bg-background p-2"
                    >
                      <p className="text-sm font-medium text-foreground">
                        {b.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {b.startTime}–{b.endTime}
                      </p>
                      <ul className="mt-1 space-y-0.5">
                        {b.people.map((p) => (
                          <li key={p.id} className="text-xs text-foreground">
                            {p.label}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="flex flex-1 flex-col gap-1">
                {blocks.length === 0 ? (
                  <span className="text-[10px] text-muted-foreground">—</span>
                ) : (
                  blocks.map((b) => (
                    <div
                      key={b.key}
                      className="rounded border border-border px-1 py-0.5"
                    >
                      <p className="truncate text-[10px] font-medium leading-tight">
                        {b.startTime}–{b.endTime}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {b.people.length} pers.
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Default expanded day: today if in week, else first day. */
export function defaultExpandedDay(days: string[]): string {
  const today = getTodayIso();
  if (days.includes(today)) return today;
  return days[0] ?? today;
}
