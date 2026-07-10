"use client";

import { useMemo, useState } from "react";
import { IconButton } from "@kai/ui";
import { MonthlyCalendar, type MonthlyCalendarItem } from "@/shared/components/Calendar";
import type { AccountsPayableRow } from "@/features/accounting-accounts-payable/types/accounts-payable.types";
import {
  labelAccountsPayableOriginCategory,
  resolveAccountsPayableOriginCategoryFromRow,
} from "@/features/accounting-accounts-payable/lib/accounts-payable-labels";

type Props = {
  rows: AccountsPayableRow[];
  onPay: (row: AccountsPayableRow) => void;
  onDetails: (row: AccountsPayableRow) => void;
};

function fmtClp(n: number | null | undefined): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(v);
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

export default function AccountsPayableCalendar({ rows, onPay, onDetails }: Props) {
  const [month, setMonth] = useState(() => new Date());

  const items: MonthlyCalendarItem[] = useMemo(() => {
    return rows.flatMap((r) => {
        const date = toIsoDateOnly(r.dueDate);
        if (!date) return [];
        const doc = r.parentDocumentNumber || r.documentNumber || "—";
        const originLabel = labelAccountsPayableOriginCategory(
          resolveAccountsPayableOriginCategoryFromRow(r),
        );
        const overdue = Boolean(r.isOverdue) || r.status === "OVERDUE";
        const paid = r.status === "PAID";
        const tone = paid
          ? "border-[color:var(--color-success)] bg-[color:var(--color-success)]/10"
          : overdue
            ? "border-[color:var(--color-error)] bg-[color:var(--color-error)]/10"
            : "border-[color:var(--color-info)] bg-[color:var(--color-info)]/10";

        return [{
          id: r.id,
          date,
          content: (
            <div className={`rounded-md border px-2 py-1 ${tone}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-xs font-medium">
                    {r.payeeName || "—"}
                  </div>
                  <div className="truncate text-[11px] text-muted-foreground">{doc}</div>
                  <div className="truncate text-[10px] text-muted-foreground">{originLabel}</div>
                  <div className="text-[11px] tabular-nums">{fmtClp(r.pendingAmount)}</div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <IconButton
                    icon="MoreHorizontal"
                    variant="action"
                    size="sm"
                    title="Ver detalle"
                    ariaLabel="Ver detalle"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onDetails(r);
                    }}
                  />
                  <IconButton
                    icon="HandCoins"
                    variant="action"
                    size="sm"
                    title="Registrar pago"
                    ariaLabel="Registrar pago"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onPay(r);
                    }}
                  />
                </div>
              </div>
            </div>
          ),
        } satisfies MonthlyCalendarItem];
      });
  }, [rows, onDetails, onPay]);

  return (
    <div className="flex h-full min-h-0 flex-col">
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

