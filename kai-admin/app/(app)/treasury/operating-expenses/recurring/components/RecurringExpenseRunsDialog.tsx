"use client";

import { useEffect, useState, useTransition } from "react";
import { Dialog, Alert, Button, LoadingState } from "@kai/ui";
import {
  listRecurringExpenseRunsAction,
} from "@/features/treasury-recurring-expenses/actions/recurring-expense.action";
import type { RecurringExpenseRunItem } from "@/features/treasury-recurring-expenses/types/recurring-expense.types";

function fmtDateTime(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

type Props = {
  open: boolean;
  onClose: () => void;
  recurringExpenseId: string;
  title: string;
};

export function RecurringExpenseRunsDialog({
  open,
  onClose,
  recurringExpenseId,
  title,
}: Props) {
  const [rows, setRows] = useState<RecurringExpenseRunItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setError(null);
    startTransition(async () => {
      const r = await listRecurringExpenseRunsAction(recurringExpenseId);
      if (!r.success) {
        setError(r.error);
        setRows([]);
        return;
      }
      setRows(r.rows);
    });
  }, [open, recurringExpenseId]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Historial — ${title}`}
      data-test-id="recurring-expense-runs-dialog"
      alertArea={
        error ? (
          <Alert variant="error">{error}</Alert>
        ) : null
      }
      actions={
        <Button variant="outlined" size="md" onClick={onClose}>
          Cerrar
        </Button>
      }
    >
      {isPending ? (
        <LoadingState className="py-6" />
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin corridas registradas.</p>
      ) : (
        <ul className="flex flex-col gap-2" data-test-id="recurring-expense-runs-list">
          {rows.map((run) => (
            <li
              key={run.id}
              className="rounded-lg border border-border/60 px-3 py-2 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{run.periodKey}</span>
                <span
                  className={
                    run.status === "SUCCESS" ? "text-green-700" : "text-destructive"
                  }
                >
                  {run.status === "SUCCESS" ? "OK" : "Falló"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{fmtDateTime(run.ranAt)}</p>
              {run.operationalExpenseId ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Gasto: {run.operationalExpenseId.slice(0, 8)}…
                </p>
              ) : null}
              {run.errorMessage ? (
                <p className="mt-1 text-xs text-destructive">{run.errorMessage}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}
