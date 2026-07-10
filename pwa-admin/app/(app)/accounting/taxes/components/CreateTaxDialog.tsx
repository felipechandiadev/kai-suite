"use client";

import { useEffect, useState, useTransition } from "react";
import Dialog from "@/shared/components/Dialog/Dialog";
import Alert from "@/shared/components/Alert/Alert";
import { Button } from "@/shared/components/Button";
import { TextField } from "@/shared/components/TextField/TextField";
import Select from "@/shared/components/Select/Select";
import Switch from "@/shared/components/Switch/Switch";
import type { TaxType } from "@/features/accounting-taxes/types/tax.types";
import { createTaxAction } from "@/features/accounting-taxes/actions/tax.action";
import { parseTaxRateFromInput } from "@/features/accounting-taxes/domain/tax.entity";
import { TAX_TYPE_SELECT_OPTIONS } from "./taxFormOptions";

export type CreateTaxDialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void | Promise<void>;
};

export function CreateTaxDialog({ open, onClose, onSuccess }: CreateTaxDialogProps) {
  const [name, setName] = useState("");
  const [taxType, setTaxType] = useState<TaxType>("IVA");
  const [rateStr, setRateStr] = useState("19");
  const [description, setDescription] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      return;
    }
    setName("");
    setTaxType("IVA");
    setRateStr("19");
    setDescription("");
    setIsDefault(false);
    setIsActive(true);
    setError(null);
  }, [open]);

  const handleClose = () => {
    setName("");
    setTaxType("IVA");
    setRateStr("19");
    setDescription("");
    setIsDefault(false);
    setIsActive(true);
    setError(null);
    onClose();
  };

  const handleSubmit = () => {
    setError(null);
    startTransition(() => {
      void (async () => {
        const r = await createTaxAction({
          name: name.trim(),
          taxType,
          rate: rateStr,
          description: description.trim() || undefined,
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
      title="Crear impuesto"
      size="md"
      scroll="paper"
      maxHeight="min(90vh, 800px)"
      data-test-id="tax-create-dialog"
      alertArea={
        error ? (
          <Alert variant="error" data-test-id="tax-create-error">
            {error}
          </Alert>
        ) : null
      }
      actions={
        <>
          <Button variant="outlined" size="md" onClick={handleClose} disabled={isPending} data-test-id="tax-create-cancel">
            Cancelar
          </Button>
          <Button variant="primary" size="md" onClick={handleSubmit} disabled={!canSubmit} data-test-id="tax-create-submit">
            Crear
          </Button>
        </>
      }
    >
      <div className="flex w-full min-w-0 flex-col gap-4">
        <TextField
          label="Nombre"
          name="tax-create-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre"
          required
          data-test-id="tax-create-name"
        />
        <Select
          label="Tipo"
          name="tax-create-type"
          value={taxType}
          onChange={(id) => setTaxType(String(id) as TaxType)}
          options={TAX_TYPE_SELECT_OPTIONS}
          required
          data-test-id="tax-create-type"
        />
        <TextField
          label="Tasa (%)"
          name="tax-create-rate"
          value={rateStr}
          onChange={(e) => setRateStr(e.target.value)}
          placeholder="Ej: 19"
          required
          helperText={rateHint}
          inputMode="decimal"
          data-test-id="tax-create-rate"
        />
        <TextField
          label="Descripción"
          name="tax-create-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descripción"
          rows={2}
          data-test-id="tax-create-description"
        />
        <div className="pt-1">
          <Switch
            checked={isDefault}
            onChange={setIsDefault}
            label="Impuesto predeterminado"
            labelPosition="right"
            data-test-id="tax-create-default"
          />
        </div>
        <div className="pt-1">
          <Switch
            checked={isActive}
            onChange={setIsActive}
            label="Activo en catálogo"
            labelPosition="right"
            data-test-id="tax-create-active"
          />
        </div>
      </div>
    </Dialog>
  );
}
