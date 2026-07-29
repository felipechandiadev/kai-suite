"use client";

import { useEffect, useState, useTransition } from "react";
import { Alert, Button, Dialog, Switch, TextField } from "@kai/ui";
import type { GarmentType } from "@/features/laundry-catalog/types/laundry-catalog.types";
import { updateGarmentTypeAction } from "@/features/laundry-catalog/actions/laundry-catalog.action";

export type UpdateGarmentTypeDialogProps = {
  open: boolean;
  onClose: () => void;
  type: GarmentType;
  onSuccess?: () => void | Promise<void>;
};

export function UpdateGarmentTypeDialog({ open, onClose, type, onSuccess }: UpdateGarmentTypeDialogProps) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [active, setActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setCode(type.code);
    setName(type.name);
    setActive(type.active !== false);
    setError(null);
  }, [open, type.id, type.code, type.name, type.active]);

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleSubmit = () => {
    setError(null);
    startTransition(() => {
      void (async () => {
        const r = await updateGarmentTypeAction({
          id: type.id,
          code: code.trim(),
          name: name.trim(),
          active,
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

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Actualizar tipo de prenda"
      size="md"
      scroll="paper"
      maxHeight="min(90vh, 560px)"
      data-test-id="garment-type-update-dialog"
      alertArea={
        error ? (
          <Alert variant="error" data-test-id="garment-type-update-error">
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
            onClick={handleSubmit}
            disabled={isPending || !code.trim() || !name.trim()}
          >
            Actualizar
          </Button>
        </>
      }
    >
      <div className="flex w-full min-w-0 flex-col gap-4">
        <TextField
          label="Código"
          name="garment-type-update-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Código"
          required
        />
        <TextField
          label="Nombre"
          name="garment-type-update-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre"
          required
        />
        <Switch checked={active} onChange={setActive} label="Activo" labelPosition="right" />
      </div>
    </Dialog>
  );
}
