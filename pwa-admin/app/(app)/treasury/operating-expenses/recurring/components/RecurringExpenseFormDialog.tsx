"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Dialog, Alert, Button, TextField, SelectDefault as Select } from "@kai/ui";
import type { Option } from "@kai/ui";
import { AutoComplete } from "@kai/ui";
import type { Option as AutoOption } from "@kai/ui";
import { usePurchaseDocumentReferenceData } from "@/shared/components/PurchaseDocumentBuilder/usePurchaseDocumentReferenceData";
import type { SupplierGridRow } from "@/features/purchasing-suppliers/types/supplier.types";
import { supplierOptionLabel } from "@/features/purchasing-dte/lib/supplier-option-label";
import type { ExpenseCategoryOption } from "@/features/treasury-expenses/types/operational-expense.types";
import type {
  RecurringExpenseCreatePayload,
  RecurringExpenseFrequency,
  RecurringExpenseListItem,
  RecurringExpenseUpdatePayload,
} from "@/features/treasury-recurring-expenses/types/recurring-expense.types";
import { WEEKDAY_LABELS } from "@/features/treasury-recurring-expenses/types/recurring-expense.types";
import {
  createRecurringExpenseAction,
  updateRecurringExpenseAction,
} from "@/features/treasury-recurring-expenses/actions/recurring-expense.action";

const EMPTY_SUPPLIERS: SupplierGridRow[] = [];

const FREQUENCY_OPTIONS: Option[] = [
  { id: "MONTHLY", label: "Mensual" },
  { id: "WEEKLY", label: "Semanal" },
  { id: "YEARLY", label: "Anual" },
];

const WEEKDAY_OPTIONS: Option[] = WEEKDAY_LABELS.map((label, i) => ({
  id: String(i),
  label,
}));

const DAY_OF_MONTH_OPTIONS: Option[] = Array.from({ length: 28 }, (_, i) => ({
  id: String(i + 1),
  label: String(i + 1),
}));

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  categoryOptions: ExpenseCategoryOption[];
  mode: "create" | "update";
  initial?: RecurringExpenseListItem | null;
};

export function RecurringExpenseFormDialog({
  open,
  onClose,
  onSuccess,
  categoryOptions,
  mode,
  initial,
}: Props) {
  const reference = usePurchaseDocumentReferenceData(open);
  const suppliers = reference.status === "ready" ? reference.suppliers : EMPTY_SUPPLIERS;
  const referenceError = reference.status === "error" ? reference.message : null;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [supplierOpt, setSupplierOpt] = useState<AutoOption | null>(null);
  const [totalStr, setTotalStr] = useState("0");
  const [frequency, setFrequency] = useState<RecurringExpenseFrequency>("MONTHLY");
  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const categorySelect: Option[] = useMemo(
    () => categoryOptions.map((c) => ({ id: c.id, label: c.name })),
    [categoryOptions],
  );

  const activeSuppliers = useMemo(
    () => suppliers.filter((s) => s.isActive !== false),
    [suppliers],
  );

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (mode === "update" && initial) {
      setName(initial.name);
      setDescription(initial.description ?? "");
      setCategoryId(initial.categoryId);
      setTotalStr(String(Math.round(initial.total)));
      setFrequency(initial.frequency);
      setDayOfWeek(String(initial.dayOfWeek ?? 1));
      setDayOfMonth(String(initial.dayOfMonth ?? 1));
      setSupplierOpt({
        id: initial.supplierId,
        label: initial.supplierName,
      });
    } else {
      setName("");
      setDescription("");
      setCategoryId(categoryOptions[0]?.id ?? null);
      setTotalStr("0");
      setFrequency("MONTHLY");
      setDayOfWeek("1");
      setDayOfMonth("1");
      setSupplierOpt(null);
    }
  }, [open, mode, initial, categoryOptions]);

  const canSubmit =
    !isPending &&
    name.trim().length > 0 &&
    Boolean(categoryId) &&
    Boolean(supplierOpt?.id) &&
    Number(totalStr.replace(/\D/g, "")) >= 1;

  const handleSubmit = () => {
    setError(null);
    const total = Number(String(totalStr).replace(/\D/g, "")) || 0;
    const base = {
      name: name.trim(),
      description: description.trim() || undefined,
      categoryId: categoryId!,
      supplierId: String(supplierOpt!.id),
      amountNet: total,
      taxAmount: 0,
      total,
      frequency,
      dayOfWeek: frequency === "WEEKLY" ? Number(dayOfWeek) : undefined,
      dayOfMonth: frequency === "WEEKLY" ? undefined : Number(dayOfMonth),
    };

    startTransition(async () => {
      let result:
        | { success: true; id?: string }
        | { success: false; error: string };
      if (mode === "create") {
        result = await createRecurringExpenseAction(base as RecurringExpenseCreatePayload);
      } else {
        result = await updateRecurringExpenseAction({
          ...(base as RecurringExpenseCreatePayload),
          id: initial!.id,
          isActive: initial!.isActive,
          dayOfWeek: frequency === "WEEKLY" ? Number(dayOfWeek) : null,
          dayOfMonth: frequency === "WEEKLY" ? null : Number(dayOfMonth),
        } as RecurringExpenseUpdatePayload);
      }
      if (!result.success) {
        setError(result.error);
        return;
      }
      onSuccess?.();
      onClose();
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={mode === "create" ? "Crear gasto recurrente" : "Actualizar gasto recurrente"}
      data-test-id="recurring-expense-form-dialog"
      alertArea={
        error || referenceError ? (
          <Alert variant="error" data-test-id="recurring-expense-form-error">
            {error || referenceError}
          </Alert>
        ) : null
      }
      actions={
        <>
          <Button variant="outlined" size="md" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSubmit}
            disabled={!canSubmit}
            loading={isPending}
          >
            {mode === "create" ? "Crear" : "Actualizar"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <TextField
          label="Nombre"
          placeholder="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          data-test-id="recurring-expense-form-name"
        />
        <Select
          label="Categoría"
          options={categorySelect}
          value={categoryId}
          onChange={(id) => setCategoryId(String(id))}
          data-test-id="recurring-expense-form-category"
        />
        <AutoComplete
          label="Proveedor"
          name="recurring-expense-supplier"
          placeholder="Proveedor"
          options={activeSuppliers.map((s) => ({
            id: s.id,
            label: supplierOptionLabel(s),
          }))}
          value={supplierOpt}
          onChange={setSupplierOpt}
          alwaysShowLabel
          data-test-id="recurring-expense-form-supplier"
        />
        <TextField
          label="Monto total (CLP)"
          placeholder="Monto total (CLP)"
          value={totalStr}
          onChange={(e) => setTotalStr(e.target.value)}
          inputMode="numeric"
          data-test-id="recurring-expense-form-total"
        />
        <Select
          label="Frecuencia"
          options={FREQUENCY_OPTIONS}
          value={frequency}
          onChange={(id) => setFrequency(String(id) as RecurringExpenseFrequency)}
          data-test-id="recurring-expense-form-frequency"
        />
        {frequency === "WEEKLY" ? (
          <Select
            label="Día de la semana"
            options={WEEKDAY_OPTIONS}
            value={dayOfWeek}
            onChange={(id) => setDayOfWeek(String(id))}
            data-test-id="recurring-expense-form-dow"
          />
        ) : (
          <Select
            label="Día del mes"
            options={DAY_OF_MONTH_OPTIONS}
            value={dayOfMonth}
            onChange={(id) => setDayOfMonth(String(id))}
            data-test-id="recurring-expense-form-dom"
          />
        )}
        <TextField
          label="Descripción"
          placeholder="Descripción"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          data-test-id="recurring-expense-form-desc"
        />
        <p className="text-xs text-muted-foreground">
          Al generar se crea un gasto operativo tipo «Otro», pendiente de pago.
        </p>
      </div>
    </Dialog>
  );
}
