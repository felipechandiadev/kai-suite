"use client";

import { useEffect, useState, useTransition } from "react";
import Dialog from "@/shared/components/Dialog/Dialog";
import Alert from "@/shared/components/Alert/Alert";
import { Button } from "@/shared/components/Button";
import { TextField } from "@/shared/components/TextField/TextField";
import Select from "@/shared/components/Select/Select";
import Switch from "@/shared/components/Switch/Switch";
import type { TaxListItem, TaxType } from "@/features/accounting-taxes/types/tax.types";
import { updateTaxAction } from "@/features/accounting-taxes/actions/tax.action";
import { parseTaxRateFromInput } from "@/features/accounting-taxes/domain/tax.entity";
import { TAX_TYPE_SELECT_OPTIONS } from "./taxFormOptions";

export type UpdateTaxDialogProps = {
  open: boolean;
  onClose: () => void;
  tax: TaxListItem;
  onSuccess?: () => void | Promise<void>;
};

export function UpdateTaxDialog({ open, onClose, tax, onSuccess }: UpdateTaxDialogProps) {
  const [name, setName] = useState("");
  const [taxType, setTaxType] = useState<TaxType>("IVA");
  const [rateStr, setRateStr] = useState("");
  const [description, setDescription] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      return;
    }
    setName(tax.name);
    setTaxType(tax.taxType);
    setRateStr(String(tax.rate));
    setDescription(tax.description ?? "");
    setIsDefault(tax.isDefault);
    setIsActive(tax.isActive);
    setError(null);
  }, [open, tax]);

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleSubmit = () => {
    setError(null);
    startTransition(() => {
      void (async () => {
        const r = await updateTaxAction({
          id: tax.id,
          name: name.trim(),
          code: tax.code ?? null,
          taxType,
          rate: rateStr,
          description: description.trim(),
          isDefault,
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

  const parsedRate = parseTaxRateFromInput(rateStr);
  const canSubmit = name.trim() && parsedRate != null && !isPending;
  const rateHint =
    rateStr.trim() !== "" && parsedRate == null
      ? "La tasa debe ser mayor a 0% (máx. 999,99)"
      : undefined;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Actualizar impuesto"
      size="md"
      scroll="paper"
      maxHeight="min(90vh, 800px)"
      data-test-id="tax-update-dialog"
      alertArea={
        error ? (
          <Alert variant="error" data-test-id="tax-update-error">
            {error}
          </Alert>
        ) : null
      }
      actions={
        <>
          <Button variant="outlined" size="md" onClick={handleClose} disabled={isPending} data-test-id="tax-update-cancel">
            Cancelar
          </Button>
          <Button variant="primary" size="md" onClick={handleSubmit} disabled={!canSubmit} data-test-id="tax-update-submit">
            Guardar
          </Button>
        </>
      }
    >
      <div className="flex w-full min-w-0 flex-col gap-4">
        <TextField
          label="Nombre"
          name="tax-update-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre"
          required
          data-test-id="tax-update-name"
        />
        <Select
          label="Tipo"
          name="tax-update-type"
          value={taxType}
          onChange={(id) => setTaxType(String(id) as TaxType)}
          options={TAX_TYPE_SELECT_OPTIONS}
          required
          data-test-id="tax-update-type"
        />
        <TextField
          label="Tasa (%)"
          name="tax-update-rate"
          value={rateStr}
          onChange={(e) => setRateStr(e.target.value)}
          placeholder="Ej: 19"
          required
          helperText={rateHint}
          inputMode="decimal"
          data-test-id="tax-update-rate"
        />
        <TextField
          label="Descripción"
          name="tax-update-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descripción"
          rows={2}
          data-test-id="tax-update-description"
        />
        <div className="pt-1">
          <Switch
            checked={isDefault}
            onChange={setIsDefault}
            label="Impuesto predeterminado"
            labelPosition="right"
            data-test-id="tax-update-default"
          />
        </div>
        <div className="pt-1">
          <Switch
            checked={isActive}
            onChange={setIsActive}
            label="Activo en catálogo"
            labelPosition="right"
            data-test-id="tax-update-active"
          />
        </div>
      </div>
    </Dialog>
  );
}
