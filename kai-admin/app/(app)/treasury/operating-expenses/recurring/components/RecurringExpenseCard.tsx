"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, Badge, Alert } from "@kai/ui";
import type { RecurringExpenseListItem } from "@/features/treasury-recurring-expenses/types/recurring-expense.types";
import {
  pauseRecurringExpenseAction,
  resumeRecurringExpenseAction,
} from "@/features/treasury-recurring-expenses/actions/recurring-expense.action";
import { OPERATIONAL_EXPENSE_DOCUMENT_KIND_LABELS } from "@/features/treasury-expenses/types/operational-expense.types";
import { RecurringExpenseFormDialog } from "./RecurringExpenseFormDialog";

type Props = {
  item: RecurringExpenseListItem;
  onUseTemplate: (item: RecurringExpenseListItem) => void;
};

export function RecurringExpenseCard({ item, onUseTemplate }: Props) {
  const router = useRouter();
  const [updateOpen, setUpdateOpen] = useState(false);
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

  const kindLabel =
    OPERATIONAL_EXPENSE_DOCUMENT_KIND_LABELS[item.documentKind] ?? item.documentKind;

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
        <span className="text-muted-foreground">Documento: </span>
        {kindLabel}
      </p>
      {item.description ? (
        <p className="text-muted-foreground line-clamp-2">{item.description}</p>
      ) : null}
      <p className="text-xs text-muted-foreground pt-1">
        Clic para registrar un gasto con estos datos
      </p>
    </div>
  );

  return (
    <>
      <Card
        fillHeight
        className="h-full overflow-hidden border-border/90 shadow-sm transition-shadow duration-200 hover:shadow-md"
        title={item.name}
        onClick={() => onUseTemplate(item)}
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
            ariaLabel: "Editar plantilla",
            onClick: (e) => {
              e.stopPropagation();
              setUpdateOpen(true);
            },
            "data-test-id": "recurring-expense-card-update",
          },
          {
            id: "pause-resume",
            icon: item.isActive ? "Pause" : "Play",
            ariaLabel: item.isActive ? "Pausar" : "Reanudar",
            disabled: isPending,
            onClick: (e) => {
              e.stopPropagation();
              runAction(() =>
                item.isActive
                  ? pauseRecurringExpenseAction(item.id)
                  : resumeRecurringExpenseAction(item.id),
              );
            },
            "data-test-id": "recurring-expense-card-pause",
          },
        ]}
        data-test-id={`recurring-expense-card-${item.id}`}
      />

      <RecurringExpenseFormDialog
        open={updateOpen}
        onClose={() => setUpdateOpen(false)}
        onSuccess={refresh}
        initial={item}
      />
    </>
  );
}
