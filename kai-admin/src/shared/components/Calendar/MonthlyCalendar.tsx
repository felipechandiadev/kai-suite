"use client";

import { useMemo } from "react";

export type MonthlyCalendarItem = {
  id: string;
  /** ISO date `YYYY-MM-DD` (recommended) or any string parseable by Date. */
  date: string;
  /** Rendered content inside the day cell. */
  content: React.ReactNode;
};

export type MonthlyCalendarProps = {
  /** Month to render; defaults to current month. */
  month?: Date;
  /** Items rendered inside their date cell. */
  items: MonthlyCalendarItem[];
  /** Optional header right-side slot (actions / filters). */
  headerRight?: React.ReactNode;
  /** Called when user clicks a day cell. */
  onSelectDate?: (isoDate: string) => void;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseDateOnly(isoOrAny: string): Date | null {
  const s = (isoOrAny ?? "").trim();
  if (!s) return null;
  // Prefer YYYY-MM-DD to avoid timezone drift
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const da = Number(m[3]);
    const d = new Date(y, mo, da);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

/** Monday-first calendar grid */
function mondayIndex(jsDay: number): number {
  // JS: 0=Sun..6=Sat => 0=Mon..6=Sun
  return (jsDay + 6) % 7;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function sameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export default function MonthlyCalendar({
  month = new Date(),
  items,
  headerRight,
  onSelectDate,
}: MonthlyCalendarProps) {
  const monthStart = useMemo(() => startOfMonth(month), [month]);
  const monthEnd = useMemo(() => endOfMonth(month), [month]);

  const gridStart = useMemo(() => {
    const offset = mondayIndex(monthStart.getDay());
    return addDays(monthStart, -offset);
  }, [monthStart]);

  const gridEnd = useMemo(() => {
    const offset = 6 - mondayIndex(monthEnd.getDay());
    return addDays(monthEnd, offset);
  }, [monthEnd]);

  const days = useMemo(() => {
    const out: Date[] = [];
    for (let d = new Date(gridStart); d <= gridEnd; d = addDays(d, 1)) {
      out.push(new Date(d));
    }
    return out;
  }, [gridStart, gridEnd]);

  const itemsByDate = useMemo(() => {
    const m = new Map<string, MonthlyCalendarItem[]>();
    for (const it of items) {
      const d = parseDateOnly(it.date);
      if (!d) continue;
      const key = toIsoDate(d);
      const arr = m.get(key) ?? [];
      arr.push(it);
      m.set(key, arr);
    }
    return m;
  }, [items]);

  const title = useMemo(() => {
    return new Intl.DateTimeFormat("es-CL", { month: "long", year: "numeric" })
      .format(monthStart)
      .replace(/^\w/, (c) => c.toUpperCase());
  }, [monthStart]);

  const todayKey = toIsoDate(new Date());

  return (
    <div className="flex h-full min-h-0 flex-col rounded-md border border-border bg-background">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-3 py-2">
        <div className="text-sm font-semibold">{title}</div>
        <div className="flex items-center gap-2">{headerRight}</div>
      </div>

      <div className="grid shrink-0 grid-cols-7 border-b border-border bg-muted/30 text-xs text-muted-foreground">
        {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
          <div key={d} className="px-2 py-2 font-medium">
            {d}
          </div>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <div className="grid grid-cols-7">
        {days.map((d) => {
          const key = toIsoDate(d);
          const inMonth = sameMonth(d, monthStart);
          const isToday = key === todayKey;
          const isMonthStart = inMonth && d.getDate() === 1;
          const dayItems = itemsByDate.get(key) ?? [];
          return (
            <div
              key={key}
              onClick={() => onSelectDate?.(key)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectDate?.(key);
                }
              }}
              role="button"
              tabIndex={0}
              className={[
                "min-h-[112px] border-b border-r border-border px-2 py-2 text-left align-top",
                "focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)]/40",
                inMonth
                  ? "bg-background hover:bg-[color:var(--color-hover)]"
                  : "bg-[color:var(--color-neutral)] text-muted-foreground hover:bg-[color:var(--color-neutral)]",
                isMonthStart ? "border-l-2 border-l-[color:var(--color-accent)]" : "",
              ].join(" ")}
            >
              <div className="flex items-center justify-between">
                <div
                  className={[
                    "text-xs font-medium tabular-nums",
                    isToday
                      ? "rounded-full bg-[color:var(--color-accent)] px-2 py-0.5 text-white"
                      : !inMonth
                        ? "opacity-70"
                        : "",
                  ].join(" ")}
                >
                  {d.getDate()}
                </div>
              </div>

              <div className={["mt-2 flex flex-col gap-1", !inMonth ? "opacity-80" : ""].join(" ")}>
                {dayItems.map((it) => (
                  <div key={it.id} className="min-w-0">
                    {it.content}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}

