"use client";

import { useMemo, useState } from "react";
import { IconButton } from "@kai/ui";
import { MonthlyCalendar, type MonthlyCalendarItem } from "@/shared/components/Calendar";
import {
  CHECK_DIRECTION_LABELS,
  checkStatusLabel,
  type CheckRow,
} from "@/features/treasury-checks/types/check.types";

type Props = {
  rows: CheckRow[];
  onDetails: (row: CheckRow) => void;
};

function fmtClp(n: number, currency = "CLP"): string {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

function toIsoDateOnly(iso: string | null | undefined): string | null {
  const s = typeof iso === "string" ? iso.trim() : "";
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  const pad2 = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function addMonth(d: Date, delta: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}

function toneForStatus(status: CheckRow["status"]): string {
  switch (status) {
    case "CLEARED":
      return "border-[color:var(--color-success)] bg-[color:var(--color-success)]/10";
    case "BOUNCED":
    case "VOIDED":
      return "border-[color:var(--color-error)] bg-[color:var(--color-error)]/10";
    case "DEPOSITED":
      return "border-[color:var(--color-info)] bg-[color:var(--color-info)]/10";
    case "PENDING":
      return "border-[color:var(--color-warning)] bg-[color:var(--color-warning)]/10";
    case "ENDORSED":
      return "border-[color:var(--color-primary)] bg-[color:var(--color-primary)]/10";
    default:
      return "border-border bg-muted/20";
  }
}

export function ChecksCalendar({ rows, onDetails }: Props) {
  const [month, setMonth] = useState(() => new Date());

  const withoutDueDate = useMemo(
    () => rows.filter((r) => !toIsoDateOnly(r.dueDate)).length,
    [rows],
  );

  const items: MonthlyCalendarItem[] = useMemo(() => {
    return rows.flatMap((r) => {
      const date = toIsoDateOnly(r.dueDate);
      if (!date) return [];
      const counterparty =
        r.direction === "INCOMING" ? r.drawerName ?? "—" : r.payeeName ?? "—";
      return [
        {
          id: r.id,
          date,
          content: (
            <button
              type="button"
              className={`w-full rounded-md border px-2 py-1 text-left ${toneForStatus(r.status)}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDetails(r);
              }}
              data-test-id={`checks-calendar-item-${r.id}`}
            >
              <div className="truncate text-xs font-medium">{counterparty}</div>
              <div className="truncate text-[11px] text-muted-foreground">
                {CHECK_DIRECTION_LABELS[r.direction]} · N° {r.checkNumber}
              </div>
              <div className="truncate text-[10px] text-muted-foreground">
                {checkStatusLabel(r.status, r.direction)}
              </div>
              <div className="text-[11px] tabular-nums">
                {fmtClp(Number(r.amount), r.currency || "CLP")}
              </div>
            </button>
          ),
        } satisfies MonthlyCalendarItem,
      ];
    });
  }, [rows, onDetails]);

  return (
    <div className="flex min-h-0 flex-col gap-2" data-test-id="checks-calendar">
      {withoutDueDate > 0 ? (
        <p className="text-xs text-muted-foreground" data-test-id="checks-calendar-no-due-hint">
          {withoutDueDate} cheque{withoutDueDate === 1 ? "" : "s"} sin fecha «A fecha» no
          aparecen en el calendario.
        </p>
      ) : null}
      <MonthlyCalendar
        month={month}
        items={items}
        headerRight={
          <div className="flex items-center gap-1">
            <IconButton
              icon="ChevronLeft"
              variant="action"
              size="sm"
              title="Mes anterior"
              ariaLabel="Mes anterior"
              onClick={() => setMonth((m) => addMonth(m, -1))}
            />
            <IconButton
              icon="ChevronRight"
              variant="action"
              size="sm"
              title="Mes siguiente"
              ariaLabel="Mes siguiente"
              onClick={() => setMonth((m) => addMonth(m, 1))}
            />
          </div>
        }
      />
    </div>
  );
}
