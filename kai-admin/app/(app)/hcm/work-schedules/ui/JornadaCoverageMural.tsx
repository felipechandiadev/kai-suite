"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getTodayIso } from "@kai/ui";
import type { JornadaEmployeeRow } from "@/features/hr-jornada/types/jornada.types";
import { WEEKDAY_LABELS } from "@/features/hr-jornada/types/employee-shift.types";
import {
  personAccentStyle,
  shiftBlockStyle,
  shiftRailStyle,
} from "@/features/hr-jornada/ui/jornada-planner-tones";

export type MuralDraft = {
  employeeId: string;
  workDate: string;
  startTime: string;
  endTime: string;
  /** Fixed UL shift band; does not move when the person jornada is resized. */
  shiftBandStartTime?: string | null;
  shiftBandEndTime?: string | null;
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
  /** Clave employeeId|workDate → línea compacta de excepciones. */
  exceptionLinesByKey?: Map<string, string>;
  onExpandDay: (day: string) => void;
  onUpdateAssignment?: (args: {
    employeeId: string;
    workDate: string;
    startTime: string;
    endTime: string;
  }) => void;
  onRemoveAssignment?: (args: {
    employeeId: string;
    workDate: string;
  }) => void;
  onAddException?: (args: {
    employeeId: string;
    workDate: string;
  }) => void;
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
const SNAP_MINUTES = 15;
const MIN_DURATION_MINUTES = 30;

function personKey(employeeId: string, workDate: string): string {
  return `${employeeId}|${workDate}`;
}

function parseHmToMinutes(hm: string): number {
  const [h, m] = hm.split(":").map((x) => Number(x));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
}

function minutesToHm(total: number): string {
  const normalized = ((Math.round(total) % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function snapMinutes(m: number): number {
  return Math.round(m / SNAP_MINUTES) * SNAP_MINUTES;
}

function formatHourLabel(minutes: number): string {
  return minutesToHm(minutes);
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
    for (const p of b.people) {
      const ps = parseHmToMinutes(p.startTime);
      const pe = blockEndMinutes(p.startTime, p.endTime);
      minS = Math.min(minS, ps);
      maxE = Math.max(maxE, pe);
    }
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
      : `adhoc|${d.shiftBandStartTime ?? d.startTime}|${d.shiftBandEndTime ?? d.endTime}`;
    const bandStart = d.shiftBandStartTime?.trim() || d.startTime;
    const bandEnd = d.shiftBandEndTime?.trim() || d.endTime;
    let block = map.get(key);
    if (!block) {
      block = {
        key,
        laborUnitShiftId: d.laborUnitShiftId ?? null,
        name:
          d.laborUnitShiftName?.trim() ||
          `Turno ${bandStart}–${bandEnd}`,
        startTime: bandStart,
        endTime: bandEnd,
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

/** Position people relative to the fixed shift band (may overflow above/below).
 * Columns are assigned in stable employeeId order so resizing hours does not swap left/right. */
function layoutPeopleInBlock(
  people: ShiftPerson[],
  blockStartHm: string,
  blockEndHm: string,
  blockHeight: number,
): LaidOutPerson[] {
  const blockStart = parseHmToMinutes(blockStartHm);
  const blockEnd = blockEndMinutes(blockStartHm, blockEndHm);
  const duration = Math.max(1, blockEnd - blockStart);

  // Stable order by id so column packing does not reshuffle on duration changes.
  const timed = [...people]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((p) => {
      const s = parseHmToMinutes(p.startTime);
      const e = blockEndMinutes(p.startTime, p.endTime);
      return {
        ...p,
        startMin: s,
        endMin: e,
        top: ((s - blockStart) / duration) * blockHeight,
        height: Math.max(
          PERSON_CARD_MIN_HEIGHT_PX,
          ((e - s) / duration) * blockHeight,
        ),
      };
    });

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

type ResizeSession = {
  edge: "start" | "end";
  employeeId: string;
  workDate: string;
  originStart: number;
  originEnd: number;
  dayStart: number;
  dayDuration: number;
  dayTop: number;
  dayHeight: number;
};

export function JornadaCoverageMural({
  days,
  drafts,
  employees,
  holidaySet,
  expandedDay,
  exceptionLinesByKey,
  onExpandDay,
  onUpdateAssignment,
  onRemoveAssignment,
  onAddException,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [panelHeight, setPanelHeight] = useState(420);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const resizeRef = useRef<ResizeSession | null>(null);

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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedKey(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    setSelectedKey(null);
  }, [expandedDay]);

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

  const applyResizeFromPointer = (clientY: number) => {
    const session = resizeRef.current;
    if (!session || !onUpdateAssignment) return;
    const {
      edge,
      employeeId,
      workDate,
      originStart,
      originEnd,
      dayStart,
      dayDuration,
      dayTop,
      dayHeight,
    } = session;
    const absMin = snapMinutes(
      dayStart + ((clientY - dayTop) / Math.max(1, dayHeight)) * dayDuration,
    );

    let nextStart = originStart;
    let nextEnd = originEnd;
    if (edge === "start") {
      nextStart = Math.min(absMin, originEnd - MIN_DURATION_MINUTES);
    } else {
      nextEnd = Math.max(absMin, originStart + MIN_DURATION_MINUTES);
    }
    if (nextEnd - nextStart < MIN_DURATION_MINUTES) {
      if (edge === "start") nextStart = nextEnd - MIN_DURATION_MINUTES;
      else nextEnd = nextStart + MIN_DURATION_MINUTES;
    }

    onUpdateAssignment({
      employeeId,
      workDate,
      startTime: minutesToHm(nextStart),
      endTime: minutesToHm(nextEnd),
    });
  };

  const endResize = (pointerId: number, target: Element) => {
    if (!resizeRef.current) return;
    resizeRef.current = null;
    try {
      (target as HTMLElement).releasePointerCapture(pointerId);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-1.5" data-test-id="jornada-coverage-mural-wrap">
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
            onClick={() => {
              setSelectedKey(null);
              onExpandDay(day);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setSelectedKey(null);
                onExpandDay(day);
              }
            }}
            className={[
              "flex h-full shrink-0 flex-col rounded-lg border text-left transition-all bg-background",
              expanded
                ? "min-w-[min(100%,420px)] flex-[3] overflow-visible border-foreground/30"
                : "flex-none cursor-pointer overflow-hidden border-border hover:border-border/80",
              isToday ? "ring-1 ring-primary/30" : "",
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
                isHoliday
                  ? "bg-warning/10"
                  : expanded
                    ? "bg-muted/30"
                    : "bg-background",
                expanded ? "px-2 py-2" : "px-0.5 py-1.5",
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

            <div
              className={[
                "min-h-0 flex-1",
                expanded
                  ? "overflow-visible"
                  : "overflow-y-auto overflow-x-hidden",
              ].join(" ")}
            >
              <div
                className="relative flex w-full"
                style={{ height: timelineHeight }}
              >
                <div
                  className={[
                    "relative min-w-0 flex-1",
                    expanded ? "px-2 py-0" : "px-0.5",
                  ].join(" ")}
                  data-mural-day-lane={day}
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
                      const dayDuration = Math.max(1, endMin - startMin);
                      return (
                        <div
                          key={b.key}
                          className={[
                            "absolute rounded-md border shadow-sm backdrop-blur-[1px]",
                            expanded
                              ? "right-1 left-1 flex flex-row overflow-visible"
                              : "right-0.5 left-0.5 overflow-hidden",
                          ].join(" ")}
                          style={{
                            top,
                            height,
                            ...shiftBlockStyle(b.laborUnitShiftId),
                          }}
                          data-test-id="jornada-mural-shift-block"
                          data-shift-band={`${b.startTime}-${b.endTime}`}
                          title={`${b.name} ${b.startTime}–${b.endTime} · ${peopleLabel}`}
                        >
                          {expanded ? (
                            <>
                              <div
                                className="flex shrink-0 items-stretch justify-center overflow-hidden rounded-l-md border-r border-border/50"
                                style={{
                                  width: SHIFT_LABEL_RAIL_PX,
                                  ...shiftRailStyle(b.laborUnitShiftId),
                                }}
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
                                className="relative min-w-0 flex-1 overflow-visible"
                                data-test-id="jornada-mural-shift-people"
                              >
                                {laidOut.map((p) => {
                                  const widthPct = 100 / p.columnCount;
                                  const leftPct = p.column * widthPct;
                                  const gapPx = 3;
                                  const key = personKey(p.id, day);
                                  const selected = selectedKey === key;
                                  const excLine =
                                    exceptionLinesByKey?.get(key) ?? "";
                                  const originStart = parseHmToMinutes(
                                    p.startTime,
                                  );
                                  const originEnd = blockEndMinutes(
                                    p.startTime,
                                    p.endTime,
                                  );
                                  const beginResize = (
                                    e: React.PointerEvent<HTMLDivElement>,
                                    edge: "start" | "end",
                                  ) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const lane = e.currentTarget.closest(
                                      "[data-mural-day-lane]",
                                    ) as HTMLElement | null;
                                    const laneRect =
                                      lane?.getBoundingClientRect();
                                    if (!laneRect) return;
                                    resizeRef.current = {
                                      edge,
                                      employeeId: p.id,
                                      workDate: day,
                                      originStart,
                                      originEnd,
                                      dayStart: startMin,
                                      dayDuration,
                                      dayTop: laneRect.top,
                                      dayHeight: timelineHeight,
                                    };
                                    e.currentTarget.setPointerCapture(
                                      e.pointerId,
                                    );
                                  };
                                  return (
                                    <div
                                      key={p.id}
                                      role="button"
                                      tabIndex={0}
                                      className={[
                                        "group absolute overflow-hidden rounded-md border px-1.5 py-1 shadow-sm backdrop-blur-[1px]",
                                        selected
                                          ? "z-10 border-foreground ring-2 ring-foreground/30"
                                          : "border-border/60",
                                      ].join(" ")}
                                      style={{
                                        top: p.top,
                                        height: p.height,
                                        left: `calc(${leftPct}% + ${gapPx / 2}px)`,
                                        width: `calc(${widthPct}% - ${gapPx}px)`,
                                        ...personAccentStyle(p.id),
                                      }}
                                      title={[
                                        `${p.label} ${p.startTime}–${p.endTime}`,
                                        excLine,
                                      ]
                                        .filter(Boolean)
                                        .join(" · ")}
                                      data-test-id={`jornada-mural-person-${p.id}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedKey(key);
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setSelectedKey(key);
                                        }
                                      }}
                                    >
                                      <p className="truncate pr-4 text-xs font-medium text-foreground">
                                        {p.label}
                                      </p>
                                      <p className="mt-0.5 text-[10px] tabular-nums text-muted-foreground">
                                        {p.startTime}–{p.endTime}
                                      </p>
                                      {excLine ? (
                                        <p
                                          className="mt-0.5 truncate text-[10px] text-warning"
                                          title={excLine}
                                        >
                                          {excLine}
                                        </p>
                                      ) : null}
                                      {onRemoveAssignment ? (
                                        <button
                                          type="button"
                                          className={[
                                            "absolute top-0.5 right-0.5 z-30 flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-destructive/15 hover:text-destructive",
                                            selected
                                              ? "opacity-100"
                                              : "opacity-0 group-hover:opacity-100",
                                          ].join(" ")}
                                          aria-label={`Quitar a ${p.label} del día`}
                                          data-test-id={`jornada-mural-remove-${p.id}`}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onRemoveAssignment({
                                              employeeId: p.id,
                                              workDate: day,
                                            });
                                            setSelectedKey(null);
                                          }}
                                        >
                                          <span className="text-sm leading-none" aria-hidden>
                                            ×
                                          </span>
                                        </button>
                                      ) : null}
                                      {selected && onAddException ? (
                                        <button
                                          type="button"
                                          className="absolute bottom-0.5 left-1.5 z-30 text-[9px] text-muted-foreground underline hover:text-foreground"
                                          data-test-id={`jornada-mural-exception-${p.id}`}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onAddException({
                                              employeeId: p.id,
                                              workDate: day,
                                            });
                                          }}
                                        >
                                          Excepción
                                        </button>
                                      ) : null}
                                      {selected && onUpdateAssignment ? (
                                        <>
                                          <div
                                            className="absolute inset-x-0 top-0 z-20 h-2 cursor-ns-resize bg-foreground/25 hover:bg-foreground/40"
                                            data-test-id="jornada-mural-resize-start"
                                            onClick={(e) => e.stopPropagation()}
                                            onPointerDown={(e) =>
                                              beginResize(e, "start")
                                            }
                                            onPointerMove={(e) => {
                                              if (!resizeRef.current) return;
                                              if (
                                                resizeRef.current.edge !==
                                                  "start" ||
                                                resizeRef.current.employeeId !==
                                                  p.id
                                              ) {
                                                return;
                                              }
                                              applyResizeFromPointer(e.clientY);
                                            }}
                                            onPointerUp={(e) => {
                                              endResize(
                                                e.pointerId,
                                                e.currentTarget,
                                              );
                                            }}
                                            onPointerCancel={(e) => {
                                              endResize(
                                                e.pointerId,
                                                e.currentTarget,
                                              );
                                            }}
                                          />
                                          <div
                                            className="absolute inset-x-0 bottom-0 z-20 h-2 cursor-ns-resize bg-foreground/25 hover:bg-foreground/40"
                                            data-test-id="jornada-mural-resize-end"
                                            onClick={(e) => e.stopPropagation()}
                                            onPointerDown={(e) =>
                                              beginResize(e, "end")
                                            }
                                            onPointerMove={(e) => {
                                              if (!resizeRef.current) return;
                                              if (
                                                resizeRef.current.edge !==
                                                  "end" ||
                                                resizeRef.current.employeeId !==
                                                  p.id
                                              ) {
                                                return;
                                              }
                                              applyResizeFromPointer(e.clientY);
                                            }}
                                            onPointerUp={(e) => {
                                              endResize(
                                                e.pointerId,
                                                e.currentTarget,
                                              );
                                            }}
                                            onPointerCancel={(e) => {
                                              endResize(
                                                e.pointerId,
                                                e.currentTarget,
                                              );
                                            }}
                                          />
                                        </>
                                      ) : null}
                                    </div>
                                  );
                                })}
                              </div>
                            </>
                          ) : (
                            <div
                              className="flex h-full w-full items-stretch justify-center"
                              style={shiftRailStyle(b.laborUnitShiftId)}
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
      <p className="text-xs text-muted-foreground" data-test-id="jornada-mural-color-legend">
        Color del bloque = turno · barra = persona · festivo = aviso
      </p>
    </div>
  );
}

/** Default expanded day: today if in week, else first day. */
export function defaultExpandedDay(days: string[]): string {
  const today = getTodayIso();
  if (days.includes(today)) return today;
  return days[0] ?? today;
}
