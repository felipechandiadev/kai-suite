"use client";

import { useEffect, useState, useTransition } from "react";
import { Dialog } from "@kai/ui";
import { Alert } from "@kai/ui";
import { Button } from "@kai/ui";
import { TextField } from "@kai/ui";
import { SelectDefault as Select } from "@kai/ui";
import { updateMetalPriceAction } from "@/features/metal-prices/actions/metal-price.action";
import { METAL_SELECT_OPTIONS } from "@/features/metal-prices/lib/metal-options";
import type { MetalPriceRow, MetalTypeOption } from "@/features/metal-prices/types/metal-price.types";

export type UpdateMetalPriceDialogProps = {
  open: boolean;
  onClose: () => void;
  row: MetalPriceRow | null;
  onSuccess?: () => void | Promise<void>;
};

function toDateInputValue(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function parseClp(value: string): number | null {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return null;
  const n = Number(digits);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function UpdateMetalPriceDialog({ open, onClose, row, onSuccess }: UpdateMetalPriceDialogProps) {
  const [metal, setMetal] = useState<MetalTypeOption>("Oro 18K");
  const [date, setDate] = useState("");
  const [valueStr, setValueStr] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !row) return;
    setMetal((row.metal as MetalTypeOption) || "Oro 18K");
    setDate(toDateInputValue(row.date));
    setValueStr(String(Math.round(row.valueCLP)));
    setNotes(row.notes ?? "");
    setError(null);
  }, [open, row]);

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleSubmit = () => {
    if (!row) return;
    setError(null);
    const valueCLP = parseClp(valueStr);
    if (valueCLP == null) {
      setError("Ingrese un valor CLP válido mayor a cero");
      return;
    }
    startTransition(() => {
      void (async () => {
        const r = await updateMetalPriceAction({
          id: row.id,
          metal,
          date,
          valueCLP,
          notes: notes.trim() || null,
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

  if (!row) return null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Actualizar precio de metal"
      size="md"
      alertArea={error ? <Alert variant="error">{error}</Alert> : null}
      actions={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isPending}>
            Actualizar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select
          label="Metal"
          value={metal}
          onChange={(v) => setMetal(v as MetalTypeOption)}
          options={METAL_SELECT_OPTIONS}
          required
        />
        <TextField
          label="Fecha"
          name="metal-price-date-edit"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          placeholder="Fecha"
        />
        <TextField
          label="Valor CLP"
          name="metal-price-value-edit"
          type="currency"
          currencySymbol="$"
          startSymbol="$"
          value={valueStr}
          onChange={(e) => setValueStr(e.target.value)}
          required
          placeholder="Valor CLP"
        />
        <TextField
          label="Notas"
          name="metal-price-notes-edit"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notas"
        />
      </div>
    </Dialog>
  );
}
