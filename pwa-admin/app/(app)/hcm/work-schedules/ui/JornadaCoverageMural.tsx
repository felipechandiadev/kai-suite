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

type ShiftPerson = {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
};

type ShiftBlock = {
  key: string;
  laborUnitShiftId: string | null;
  name: string;
  startTime: string;
  endTime: string;
  people: ShiftPerson[];
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
const DAY_HEADER_PX = 48;
/** Collapsed day column width (fits vertical shift label). */
const COLLAPSED_DAY_WIDTH_PX = 40;
/** Minimum height for an expanded shift block. */
const EXPANDED_BLOCK_MIN_HEIGHT_PX = 88;
/** Left rail with vertical shift label. */
const SHIFT_LABEL_RAIL_PX = 34;
/** Minimum person card height inside a shift. */
const PERSON_CARD_MIN_HEIGHT_PX = 28;

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
    const key = d.laborUnitShiftId
      ? d.laborUnitShiftId
      : `adhoc|${d.startTime}|${d.endTime}`;
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
    } else if (
      d.laborUnitShiftName?.trim() &&
      (!block.name || block.name.startsWith("Turno "))
    ) {
      block.name = d.laborUnitShiftName.trim();
    }
    if (!block.people.some((p) => p.id === d.employeeId)) {
      const label =
        d.employeeDisplayName?.trim() ||
        empName.get(d.employeeId) ||
        "Funcionario";
      block.people.push({
        id: d.employeeId,
        label,
        startTime: d.startTime,
        endTime: d.endTime,
      });
    }
  }
  for (const block of map.values()) {
    block.people.sort((a, b) => a.label.localeCompare(b.label, "es"));
    if (block.people.length > 0) {
      let minStart = Infinity;
      let maxEnd = -Infinity;
      let startHm = block.people[0]!.startTime;
      let endHm = block.people[0]!.endTime;
      for (const p of block.people) {
        const s = parseHmToMinutes(p.startTime);
        const e = blockEndMinutes(p.startTime, p.endTime);
        if (s < minStart) {
          minStart = s;
          startHm = p.startTime;
        }
        if (e > maxEnd) {
          maxEnd = e;
          endHm = p.endTime;
        }
      }
      block.startTime = startHm;
      block.endTime = endHm;
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
  expanded: boolean,
): { top: number; height: number } {
  const range = Math.max(1, rangeEnd - rangeStart);
  const start = parseHmToMinutes(block.startTime);
  const end = blockEndMinutes(block.startTime, block.endTime);
  const top = ((start - rangeStart) / range) * timelineHeight;
  const height = Math.max(
    expanded ? EXPANDED_BLOCK_MIN_HEIGHT_PX : 28,
    ((end - start) / range) * timelineHeight,
  );
  return { top, height };
}

type LaidOutPerson = ShiftPerson & {
  top: number;
  height: number;
  column: number;
  columnCount: number;
};

/** Position people inside a shift block; overlapping assignments share columns. */
function layoutPeopleInBlock(
  people: ShiftPerson[],
  blockStartHm: string,
  blockEndHm: string,
  blockHeight: number,
): LaidOutPerson[] {
  const blockStart = parseHmToMinutes(blockStartHm);
  const blockEnd = blockEndMinutes(blockStartHm, blockEndHm);
  const duration = Math.max(1, blockEnd - blockStart);

  const timed = people
    .map((p) => {
      const s = parseHmToMinutes(p.startTime);
      const e = blockEndMinutes(p.startTime, p.endTime);
      const clampedS = Math.max(blockStart, Math.min(s, blockEnd));
      const clampedE = Math.max(clampedS + 1, Math.min(e, blockEnd));
      return {
        ...p,
        startMin: clampedS,
        endMin: clampedE,
        top: ((clampedS - blockStart) / duration) * blockHeight,
        height: Math.max(
          PERSON_CARD_MIN_HEIGHT_PX,
          ((clampedE - clampedS) / duration) * blockHeight,
        ),
      };
    })
    .sort(
      (a, b) =>
        a.startMin - b.startMin ||
        b.endMin - a.endMin ||
        a.label.localeCompare(b.label, "es"),
    );

  const columnEnds: number[] = [];
  const placed: Array<(typeof timed)[number] & { column: number }> = [];
  for (const p of timed) {
    let col = columnEnds.findIndex((end) => end <= p.startMin + 0.5);
    if (col < 0) {
      col = columnEnds.length;
      columnEnds.push(p.endMin);
    } else {
      columnEnds[col] = p.endMin;
    }
    placed.push({ ...p, column: col });
  }

  const columnCount = Math.max(1, columnEnds.length);
  return placed.map((p) => ({
    id: p.id,
    label: p.label,
    startTime: p.startTime,
    endTime: p.endTime,
    top: p.top,
    height: p.height,
    column: p.column,
    columnCount,
  }));
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

function weekdayShort(idx: number): string {
  const full = WEEKDAY_LABELS[idx] ?? "";
  return full.slice(0, 3);
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
      className="flex gap-1.5 overflow-x-auto"
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
              "flex h-full shrink-0 flex-col overflow-hidden rounded-lg border text-left transition-all bg-background",
              expanded
                ? "min-w-[min(100%,420px)] flex-[3] border-foreground/30"
                : "flex-none cursor-pointer border-border hover:border-border/80",
              isToday ? "ring-1 ring-foreground/20" : "",
            ].join(" ")}
            style={
              expanded
                ? undefined
                : { width: COLLAPSED_DAY_WIDTH_PX }
            }
            data-test-id={`jornada-mural-day-${day}`}
          >
            <div
              className={[
                "shrink-0 border-b border-border/60",
                expanded
                  ? "bg-muted/30 px-2 py-2"
                  : "bg-background px-0.5 py-1.5",
              ].join(" ")}
              style={{ height: DAY_HEADER_PX }}
            >
              <p
                className={[
                  "font-semibold text-foreground",
                  expanded ? "text-xs" : "text-[10px] leading-tight",
                ].join(" ")}
              >
                {expanded ? WEEKDAY_LABELS[idx] : weekdayShort(idx)}
                {expanded && isToday ? " · hoy" : ""}
                {!expanded && isToday ? "·" : ""}
              </p>
              <p
                className={[
                  "text-muted-foreground",
                  expanded ? "text-[11px]" : "text-[9px] tabular-nums",
                ].join(" ")}
              >
                {day.slice(5)}
              </p>
              {isHoliday && expanded ? (
                <p className="text-[10px] text-warning">Festivo</p>
              ) : null}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
              <div
                className="relative flex w-full"
                style={{ height: timelineHeight }}
              >
                <div
                  className={[
                    "relative min-w-0 flex-1",
                    expanded ? "px-2 py-0" : "px-0.5",
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
                    expanded ? (
                      <p className="absolute top-3 left-2 text-xs text-muted-foreground">
                        Sin turnos
                      </p>
                    ) : null
                  ) : (
                    blocks.map((b) => {
                      const { top, height } = blockGeometry(
                        b,
                        startMin,
                        endMin,
                        timelineHeight,
                        expanded,
                      );
                      const laidOut = expanded
                        ? layoutPeopleInBlock(
                            b.people,
                            b.startTime,
                            b.endTime,
                            height,
                          )
                        : [];
                      const peopleLabel =
                        b.people.length === 1
                          ? "1 persona"
                          : `${b.people.length} personas`;
                      return (
                        <div
                          key={b.key}
                          className={[
                            "absolute overflow-hidden rounded-md border border-border bg-background shadow-sm",
                            expanded
                              ? "right-1 left-1 flex flex-row"
                              : "right-0.5 left-0.5",
                          ].join(" ")}
                          style={{ top, height }}
                          title={`${b.name} ${b.startTime}–${b.endTime} · ${peopleLabel}`}
                        >
                          {expanded ? (
                            <>
                              <div
                                className="flex shrink-0 items-stretch justify-center border-r border-border/70 bg-muted/30"
                                style={{ width: SHIFT_LABEL_RAIL_PX }}
                                data-test-id="jornada-mural-shift-label"
                              >
                                <div
                                  className="flex max-h-full items-center gap-2 px-0.5 text-[11px] leading-tight text-foreground"
                                  style={{
                                    writingMode: "vertical-rl",
                                    transform: "rotate(180deg)",
                                  }}
                                >
                                  <span className="font-medium">{b.name}</span>
                                  <span className="tabular-nums text-muted-foreground">
                                    {b.startTime}–{b.endTime} · {peopleLabel}
                                  </span>
                                </div>
                              </div>
                              <div
                                className="relative min-w-0 flex-1"
                                data-test-id="jornada-mural-shift-people"
                              >
                                {laidOut.map((p) => {
                                  const widthPct = 100 / p.columnCount;
                                  const leftPct = p.column * widthPct;
                                  const gapPx = 3;
                                  return (
                                    <div
                                      key={p.id}
                                      className="absolute overflow-hidden rounded-md border border-border/80 bg-muted/50 px-1.5 py-1 shadow-sm"
                                      style={{
                                        top: p.top,
                                        height: p.height,
                                        left: `calc(${leftPct}% + ${gapPx / 2}px)`,
                                        width: `calc(${widthPct}% - ${gapPx}px)`,
                                      }}
                                      title={`${p.label} ${p.startTime}–${p.endTime}`}
                                    >
                                      <p className="truncate text-xs font-medium text-foreground">
                                        {p.label}
                                      </p>
                                      <p className="mt-0.5 text-[10px] tabular-nums text-muted-foreground">
                                        {p.startTime}–{p.endTime}
                                      </p>
                                    </div>
                                  );
                                })}
                              </div>
                            </>
                          ) : (
                            <div
                              className="flex h-full w-full items-stretch justify-center bg-muted/20"
                              data-test-id="jornada-mural-shift-label-collapsed"
                            >
                              <div
                                className="flex max-h-full max-w-full items-center gap-1.5 overflow-hidden px-0.5 text-[9px] leading-tight text-foreground"
                                style={{
                                  writingMode: "vertical-rl",
                                  transform: "rotate(180deg)",
                                }}
                              >
                                <span className="font-medium">{b.name}</span>
                                <span className="tabular-nums text-muted-foreground">
                                  {b.startTime}–{b.endTime} · {peopleLabel}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

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
