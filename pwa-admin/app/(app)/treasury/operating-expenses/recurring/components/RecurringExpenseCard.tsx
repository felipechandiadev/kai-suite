"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, Badge, Alert } from "@kai/ui";
import type { RecurringExpenseListItem } from "@/features/treasury-recurring-expenses/types/recurring-expense.types";
import {
  RECURRING_FREQUENCY_LABELS,
  WEEKDAY_LABELS,
} from "@/features/treasury-recurring-expenses/types/recurring-expense.types";
import {
  generateRecurringExpenseAction,
  pauseRecurringExpenseAction,
  resumeRecurringExpenseAction,
} from "@/features/treasury-recurring-expenses/actions/recurring-expense.action";
import type { ExpenseCategoryOption } from "@/features/treasury-expenses/types/operational-expense.types";
import { RecurringExpenseFormDialog } from "./RecurringExpenseFormDialog";
import { RecurringExpenseRunsDialog } from "./RecurringExpenseRunsDialog";

function fmtClp(n: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

function fmtDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function scheduleLabel(item: RecurringExpenseListItem): string {
  const freq = RECURRING_FREQUENCY_LABELS[item.frequency];
  if (item.frequency === "WEEKLY" && item.dayOfWeek != null) {
    return `${freq} · ${WEEKDAY_LABELS[item.dayOfWeek] ?? item.dayOfWeek}`;
  }
  if (item.dayOfMonth != null) {
    return `${freq} · día ${item.dayOfMonth}`;
  }
  return freq;
}

type Props = {
  item: RecurringExpenseListItem;
  categoryOptions: ExpenseCategoryOption[];
};

export function RecurringExpenseCard({ item, categoryOptions }: Props) {
  const router = useRouter();
  const [updateOpen, setUpdateOpen] = useState(false);
  const [runsOpen, setRunsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const refresh = () => router.refresh();

  const runAction = (
    fn: () => Promise<{ success: true } | { success: false; error: string }>,
  ) => {
    setError(null);
    startTransition(async () => {
      const r = await fn();
      if (!r.success) {
        setError(r.error);
        return;
      }
      refresh();
    });
  };

  const content = (
    <div className="flex flex-col gap-2 text-sm" data-test-id="recurring-expense-card-body">
      {error ? (
        <Alert variant="error" data-test-id="recurring-expense-card-error">
          {error}
        </Alert>
      ) : null}
      <p>
        <span className="text-muted-foreground">Categoría: </span>
        {item.categoryName}
      </p>
      <p>
        <span className="text-muted-foreground">Proveedor: </span>
        {item.supplierName}
      </p>
      <p>
        <span className="text-muted-foreground">Monto: </span>
        {fmtClp(item.total)}
      </p>
      <p>
        <span className="text-muted-foreground">Frecuencia: </span>
        {scheduleLabel(item)}
      </p>
      <p>
        <span className="text-muted-foreground">Próxima corrida: </span>
        {fmtDate(item.nextRunAt)}
      </p>
      {item.lastRunAt ? (
        <p>
          <span className="text-muted-foreground">Última corrida: </span>
          {fmtDate(item.lastRunAt)}
        </p>
      ) : null}
    </div>
  );

  return (
    <>
      <Card
        fillHeight
        className="h-full overflow-hidden border-border/90 shadow-sm transition-shadow duration-200 hover:shadow-md"
        title={item.name}
        headerEnd={
          <Badge variant={item.isActive ? "success" : "secondary-outlined"}>
            {item.isActive ? "Activa" : "Pausada"}
          </Badge>
        }
        content={content}
        actions={[
          {
            id: "update",
            icon: "Pencil",
            ariaLabel: "Actualizar gasto recurrente",
            onClick: () => setUpdateOpen(true),
            "data-test-id": "recurring-expense-card-update",
          },
          {
            id: "generate",
            icon: "RefreshCw",
            ariaLabel: "Generar gasto ahora",
            disabled: isPending,
            onClick: () =>
              runAction(async () => {
                const r = await generateRecurringExpenseAction(item.id);
                if (!r.success) return r;
                return { success: true as const };
              }),
            "data-test-id": "recurring-expense-card-generate",
          },
          {
            id: "pause-resume",
            icon: item.isActive ? "Pause" : "Play",
            ariaLabel: item.isActive ? "Pausar" : "Reanudar",
            disabled: isPending,
            onClick: () =>
              runAction(() =>
                item.isActive
                  ? pauseRecurringExpenseAction(item.id)
                  : resumeRecurringExpenseAction(item.id),
              ),
            "data-test-id": "recurring-expense-card-pause",
          },
          {
            id: "history",
            icon: "History",
            ariaLabel: "Ver historial",
            onClick: () => setRunsOpen(true),
            "data-test-id": "recurring-expense-card-history",
          },
        ]}
        data-test-id={`recurring-expense-card-${item.id}`}
      />

      <RecurringExpenseFormDialog
        open={updateOpen}
        onClose={() => setUpdateOpen(false)}
        onSuccess={refresh}
        categoryOptions={categoryOptions}
        mode="update"
        initial={item}
      />
      <RecurringExpenseRunsDialog
        open={runsOpen}
        onClose={() => setRunsOpen(false)}
        recurringExpenseId={item.id}
        title={item.name}
      />
    </>
  );
}
