"use client";

import { useEffect, useState, useTransition } from "react";
import { Alert, Button, Dialog, Switch, TextField } from "@kai/ui";
import type { GarmentAttribute } from "@/features/laundry-catalog/types/laundry-catalog.types";
import { updateGarmentAttributeAction } from "@/features/laundry-catalog/actions/laundry-catalog.action";

export type UpdateLaundryAttributeDialogProps = {
  open: boolean;
  onClose: () => void;
  attribute: GarmentAttribute;
  onSuccess?: () => void | Promise<void>;
};

export function UpdateLaundryAttributeDialog({
  open,
  onClose,
  attribute,
  onSuccess,
}: UpdateLaundryAttributeDialogProps) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [active, setActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setCode(attribute.code);
    setName(attribute.name);
    setActive(attribute.active !== false);
    setError(null);
  }, [open, attribute.id, attribute.code, attribute.name, attribute.active]);

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleSubmit = () => {
    setError(null);
    startTransition(() => {
      void (async () => {
        const r = await updateGarmentAttributeAction({
          id: attribute.id,
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
      title="Actualizar atributo"
      size="md"
      scroll="paper"
      maxHeight="min(90vh, 560px)"
      alertArea={
        error ? (
          <Alert variant="error" data-test-id="laundry-attribute-update-error">
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
          name="laundry-attribute-update-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Código"
          required
        />
        <TextField
          label="Nombre"
          name="laundry-attribute-update-name"
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
