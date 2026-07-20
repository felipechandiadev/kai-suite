"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

/** Pixels per hour when the timeline is not stretched to fill the panel. */
const PX_PER_HOUR = 52;
/** Bottom margin under the mural relative to the viewport. */
const VIEWPORT_BOTTOM_MARGIN_PX = 24;
/** Day column header height (approx) reserved above the timeline. */
const DAY_HEADER_PX = 52;

function parseHmToMinutes(hm: string): number {
  const [h, m] = hm.split(":").map((x) => Number(x));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
}

function formatHourLabel(minutes: number): string {
  const normalized = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function blockEndMinutes(start: string, end: string): number {
  const s = parseHmToMinutes(start);
  let e = parseHmToMinutes(end);
  if (e <= s) e += 24 * 60;
  return e;
}

function computeRangeMinutes(blocks: ShiftBlock[]): {
  startMin: number;
  endMin: number;
} {
  if (blocks.length === 0) {
    return { startMin: 6 * 60, endMin: 22 * 60 };
  }
  let minS = Infinity;
  let maxE = -Infinity;
  for (const b of blocks) {
    const s = parseHmToMinutes(b.startTime);
    const e = blockEndMinutes(b.startTime, b.endTime);
    minS = Math.min(minS, s);
    maxE = Math.max(maxE, e);
  }
  const startMin = Math.max(0, Math.floor(minS / 60) * 60 - 60);
  const endMin = Math.ceil(maxE / 60) * 60 + 60;
  return {
    startMin,
    endMin: Math.max(endMin, startMin + 8 * 60),
  };
}

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
        name:
          d.laborUnitShiftName?.trim() ||
          `Turno ${d.startTime}–${d.endTime}`,
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

function blockGeometry(
  block: ShiftBlock,
  rangeStart: number,
  rangeEnd: number,
  timelineHeight: number,
): { top: number; height: number } {
  const range = Math.max(1, rangeEnd - rangeStart);
  const start = parseHmToMinutes(block.startTime);
  const end = blockEndMinutes(block.startTime, block.endTime);
  const top = ((start - rangeStart) / range) * timelineHeight;
  const height = Math.max(
    28,
    ((end - start) / range) * timelineHeight,
  );
  return { top, height };
}

function hourMarks(rangeStart: number, rangeEnd: number): number[] {
  const marks: number[] = [];
  const first = Math.ceil(rangeStart / 60) * 60;
  for (let m = first; m <= rangeEnd; m += 60) {
    marks.push(m);
  }
  if (marks.length === 0 || marks[0] !== rangeStart) {
    marks.unshift(rangeStart);
  }
  if (marks[marks.length - 1] !== rangeEnd) {
    marks.push(rangeEnd);
  }
  return marks;
}

export function JornadaCoverageMural({
  days,
  drafts,
  employees,
  holidaySet,
  expandedDay,
  onExpandDay,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [panelHeight, setPanelHeight] = useState(420);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const update = () => {
      const top = el.getBoundingClientRect().top;
      const next = Math.max(
        320,
        Math.floor(window.innerHeight - top - VIEWPORT_BOTTOM_MARGIN_PX),
      );
      setPanelHeight(next);
    };

    update();
    const raf = requestAnimationFrame(update);
    window.addEventListener("resize", update);
    const ro = new ResizeObserver(update);
    ro.observe(document.documentElement);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", update);
      ro.disconnect();
    };
  }, [days, expandedDay, drafts, holidaySet]);

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

  const allBlocks = useMemo(
    () => days.flatMap((d) => byDay.get(d) ?? []),
    [days, byDay],
  );

  const { startMin, endMin } = useMemo(
    () => computeRangeMinutes(allBlocks),
    [allBlocks],
  );

  const hours = useMemo(
    () => hourMarks(startMin, endMin),
    [startMin, endMin],
  );

  const timelineBodyHeight = Math.max(0, panelHeight - DAY_HEADER_PX);
  const naturalTimelineHeight =
    ((endMin - startMin) / 60) * PX_PER_HOUR;
  const timelineHeight = Math.max(
    naturalTimelineHeight,
    timelineBodyHeight,
  );

  const today = getTodayIso();

  return (
    <div
      ref={rootRef}
      className="flex gap-2 overflow-x-auto"
      style={{ height: panelHeight }}
      data-test-id="jornada-coverage-mural"
    >
      {days.map((day, idx) => {
        const expanded = day === expandedDay;
        const blocks = byDay.get(day) ?? [];
        const isToday = day === today;
        const isHoliday = holidaySet.has(day);

        return (
          <div
            key={day}
            role="button"
            tabIndex={0}
            onClick={() => onExpandDay(day)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onExpandDay(day);
              }
            }}
            className={[
              "flex h-full shrink-0 flex-col overflow-hidden rounded-lg border text-left transition-all",
              expanded
                ? "min-w-[min(100%,300px)] flex-[2.2] border-foreground/30 bg-muted/20"
                : "w-[88px] flex-none cursor-pointer border-border bg-background hover:bg-muted/30",
              isToday ? "ring-1 ring-foreground/20" : "",
            ].join(" ")}
            data-test-id={`jornada-mural-day-${day}`}
          >
            <div
              className="shrink-0 border-b border-border/60 px-2 py-2"
              style={{ height: DAY_HEADER_PX }}
            >
              <p className="text-xs font-semibold text-foreground">
                {WEEKDAY_LABELS[idx]}
                {isToday ? " · hoy" : ""}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {day.slice(5)}
              </p>
              {isHoliday ? (
                <p className="text-[10px] text-warning">Festivo</p>
              ) : null}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
              <div
                className="relative flex w-full"
                style={{ height: timelineHeight }}
              >
                {/* Shift lane */}
                <div
                  className={[
                    "relative min-w-0 flex-1",
                    expanded ? "px-2 py-0" : "px-1",
                  ].join(" ")}
                >
                  {hours.map((mark) => {
                    const top =
                      ((mark - startMin) / Math.max(1, endMin - startMin)) *
                      timelineHeight;
                    return (
                      <div
                        key={`grid-${day}-${mark}`}
                        className="pointer-events-none absolute right-0 left-0 border-t border-border/40"
                        style={{ top }}
                        aria-hidden
                      />
                    );
                  })}

                  {blocks.length === 0 ? (
                    <p
                      className={[
                        "absolute left-2 text-muted-foreground",
                        expanded ? "top-3 text-xs" : "top-2 text-[10px]",
                      ].join(" ")}
                    >
                      {expanded ? "Sin turnos" : "—"}
                    </p>
                  ) : (
                    blocks.map((b) => {
                      const { top, height } = blockGeometry(
                        b,
                        startMin,
                        endMin,
                        timelineHeight,
                      );
                      return (
                        <div
                          key={b.key}
                          className={[
                            "absolute right-1 left-1 overflow-hidden rounded-md border border-border bg-background shadow-sm",
                            expanded ? "px-2 py-1.5" : "px-1 py-0.5",
                          ].join(" ")}
                          style={{ top, height }}
                          title={`${b.name} ${b.startTime}–${b.endTime}`}
                        >
                          {expanded ? (
                            <>
                              <p className="truncate text-sm font-medium text-foreground">
                                {b.name}
                              </p>
                              <p className="text-xs tabular-nums text-muted-foreground">
                                {b.startTime}–{b.endTime}
                              </p>
                              <ul className="mt-1 space-y-0.5 overflow-hidden">
                                {b.people.map((p) => (
                                  <li
                                    key={p.id}
                                    className="truncate text-xs text-foreground"
                                  >
                                    {p.label}
                                  </li>
                                ))}
                              </ul>
                            </>
                          ) : (
                            <>
                              <p className="truncate text-[10px] font-medium leading-tight tabular-nums">
                                {b.startTime}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {b.people.length}
                              </p>
                            </>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Hour scale — right side of active day; slim ticks when collapsed */}
                {expanded ? (
                  <div
                    className="relative w-12 shrink-0 border-l border-border/70 bg-background/40"
                    aria-hidden
                  >
                    {hours.map((mark) => {
                      const top =
                        ((mark - startMin) /
                          Math.max(1, endMin - startMin)) *
                        timelineHeight;
                      const isEdge =
                        mark === startMin || mark === endMin;
                      return (
                        <div
                          key={`h-${day}-${mark}`}
                          className="absolute right-1 left-0 flex justify-end pr-1"
                          style={{
                            top,
                            transform: isEdge
                              ? mark === startMin
                                ? "none"
                                : "translateY(-100%)"
                              : "translateY(-50%)",
                          }}
                        >
                          <span className="text-[10px] tabular-nums leading-none text-muted-foreground">
                            {formatHourLabel(mark)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
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
