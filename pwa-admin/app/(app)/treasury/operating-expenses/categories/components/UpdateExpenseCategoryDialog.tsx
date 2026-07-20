"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Dialog } from "@kai/ui";
import { Alert } from "@kai/ui";
import { Button } from "@kai/ui";
import { TextField } from "@kai/ui";
import { SelectDefault as Select } from "@kai/ui";
import type { Option } from "@kai/ui";
import { Switch } from "@kai/ui";
import type {
  ExpenseCategoryListItem,
  ExpenseCategoryOperationalGroupValue,
  OperationalGroupMetaItem,
} from "@/features/expense-categories/types/expense-category.types";
import { updateExpenseCategoryAction } from "@/features/expense-categories/actions/expense-category.action";

export type UpdateExpenseCategoryDialogProps = {
  open: boolean;
  onClose: () => void;
  category: ExpenseCategoryListItem;
  groupOptions: OperationalGroupMetaItem[];
  onSuccess?: () => void | Promise<void>;
};

export function UpdateExpenseCategoryDialog({
  open,
  onClose,
  category,
  groupOptions,
  onSuccess,
}: UpdateExpenseCategoryDialogProps) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [operationalExpenseGroup, setOperationalExpenseGroup] =
    useState<ExpenseCategoryOperationalGroupValue>(category.operationalExpenseGroup);
  const [description, setDescription] = useState("");
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [thresholdStr, setThresholdStr] = useState("0");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectOptions: Option[] = useMemo(
    () => groupOptions.map((g) => ({ id: g.value, label: g.label })),
    [groupOptions],
  );

  const groupDescription = useMemo(() => {
    const m = groupOptions.find((g) => g.value === operationalExpenseGroup);
    return m?.description ?? "";
  }, [groupOptions, operationalExpenseGroup]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setCode(category.code ?? "");
    setName(category.name);
    setOperationalExpenseGroup(category.operationalExpenseGroup);
    setDescription(category.description ?? "");
    setRequiresApproval(category.requiresApproval);
    setThresholdStr(String(category.approvalThreshold ?? 0));
    setIsActive(category.isActive);
    setError(null);
  }, [open, category]);

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleSubmit = () => {
    setError(null);
    const threshold = Number(String(thresholdStr).replace(",", "."));
    startTransition(() => {
      void (async () => {
        const r = await updateExpenseCategoryAction({
          id: category.id,
          ...(code.trim() ? { code: code.trim() } : {}),
          name: name.trim(),
          operationalExpenseGroup,
          description,
          requiresApproval,
          approvalThreshold: Number.isFinite(threshold) && threshold >= 0 ? threshold : 0,
          defaultResultCenterId: category.defaultResultCenterId,
          isActive,
        });
        if (r.success) {
          await onSuccess?.();
          handleClose();
        } else {
          setError(r.error);
        }
      })();
    });
  };

  const canSubmit = Boolean(name.trim() && groupOptions.length > 0 && !isPending);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Editar categoría de gasto"
      size="md"
      scroll="paper"
      maxHeight="min(90vh, 800px)"
      data-test-id="expense-category-update-dialog"
      alertArea={
        error ? (
          <Alert variant="error" data-test-id="expense-category-update-error">
            {error}
          </Alert>
        ) : null
      }
      actions={
        <>
          <Button variant="outlined" size="md" onClick={handleClose} disabled={isPending} data-test-id="expense-category-update-cancel">
            Cancelar
          </Button>
          <Button variant="primary" size="md" onClick={handleSubmit} disabled={!canSubmit} data-test-id="expense-category-update-submit">
            Guardar
          </Button>
        </>
      }
    >
      <div className="flex w-full min-w-0 flex-col gap-4">
        <TextField
          label="Código (opcional)"
          name="ec-update-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Dejar vacío para no cambiar el código actual"
          data-test-id="expense-category-update-code"
        />
        <TextField
          label="Nombre"
          name="ec-update-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          data-test-id="expense-category-update-name"
        />
        <Select
          label="Grupo operativo"
          name="ec-update-group-enum"
          value={operationalExpenseGroup}
          onChange={(id) => setOperationalExpenseGroup(String(id) as ExpenseCategoryOperationalGroupValue)}
          options={selectOptions}
          required
          data-test-id="expense-category-update-group"
        />
        {groupDescription ? (
          <p className="text-xs leading-relaxed text-muted-foreground" data-test-id="expense-category-update-group-desc">
            {groupDescription}
          </p>
        ) : null}
        <TextField
          label="Descripción (opcional)"
          name="ec-update-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          data-test-id="expense-category-update-desc"
        />
        <Switch
          checked={requiresApproval}
          onChange={setRequiresApproval}
          label="Requiere aprobación"
          labelPosition="right"
          data-test-id="expense-category-update-approval"
        />
        {requiresApproval ? (
          <TextField
            label="Monto umbral (CLP)"
            name="ec-update-threshold"
            value={thresholdStr}
            onChange={(e) => setThresholdStr(e.target.value)}
            type="text"
            inputMode="decimal"
            data-test-id="expense-category-update-threshold"
          />
        ) : null}
        <Switch
          checked={isActive}
          onChange={setIsActive}
          label="Activa"
          labelPosition="right"
          data-test-id="expense-category-update-active"
        />
      </div>
    </Dialog>
  );
}
