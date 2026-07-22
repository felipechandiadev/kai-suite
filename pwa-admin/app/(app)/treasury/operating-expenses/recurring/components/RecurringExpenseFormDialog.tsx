"use client";

import { useEffect, useState, useTransition } from "react";
import { Dialog, Alert, Button, TextField, Switch } from "@kai/ui";
import type { RecurringExpenseListItem } from "@/features/treasury-recurring-expenses/types/recurring-expense.types";
import { updateRecurringExpenseAction } from "@/features/treasury-recurring-expenses/actions/recurring-expense.action";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initial: RecurringExpenseListItem;
};

export function RecurringExpenseFormDialog({
  open,
  onClose,
  onSuccess,
  initial,
}: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setName(initial.name);
    setDescription(initial.description ?? "");
    setIsActive(initial.isActive);
    setError(null);
  }, [open, initial]);

  const handleClose = () => {
    if (isPending) return;
    setError(null);
    onClose();
  };

  const submit = () => {
    setError(null);
    startTransition(async () => {
      if (!name.trim()) {
        setError("El nombre es obligatorio.");
        return;
      }
      const r = await updateRecurringExpenseAction({
        id: initial.id,
        name: name.trim(),
        description: description.trim() || null,
        isActive,
      });
      if (!r.success) {
        setError(r.error);
        return;
      }
      onSuccess?.();
      handleClose();
    });
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Editar plantilla"
      size="md"
      data-test-id="recurring-expense-form-dialog"
      alertArea={
        error ? (
          <Alert variant="error" data-test-id="recurring-expense-form-error">
            {error}
          </Alert>
        ) : null
      }
      actions={
        <>
          <Button variant="outlined" size="md" onClick={handleClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={submit}
            disabled={isPending || !name.trim()}
          >
            Guardar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <TextField
          label="Nombre"
          name="recurring-expense-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          data-test-id="recurring-expense-name"
        />
        <TextField
          label="Descripción (opcional)"
          name="recurring-expense-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          data-test-id="recurring-expense-description"
        />
        <Switch
          checked={isActive}
          onChange={setIsActive}
          label="Activa"
          labelPosition="right"
          data-test-id="recurring-expense-active"
        />
      </div>
    </Dialog>
  );
}
