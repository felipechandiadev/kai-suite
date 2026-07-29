"use client";

import { useEffect, useState, useTransition } from "react";
import { Alert, Button, Dialog, Switch, TextField } from "@kai/ui";
import { createGarmentAttributeAction } from "@/features/laundry-catalog/actions/laundry-catalog.action";

export type CreateLaundryAttributeDialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void | Promise<void>;
};

export function CreateLaundryAttributeDialog({
  open,
  onClose,
  onSuccess,
}: CreateLaundryAttributeDialogProps) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [active, setActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setCode("");
    setName("");
    setActive(true);
    setError(null);
  }, [open]);

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleSubmit = () => {
    setError(null);
    startTransition(() => {
      void (async () => {
        const r = await createGarmentAttributeAction({
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
      title="Crear atributo"
      size="md"
      scroll="paper"
      maxHeight="min(90vh, 560px)"
      alertArea={
        error ? (
          <Alert variant="error" data-test-id="laundry-attribute-create-error">
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
            Crear
          </Button>
        </>
      }
    >
      <div className="flex w-full min-w-0 flex-col gap-4">
        <TextField
          label="Código"
          name="laundry-attribute-create-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Código"
          required
        />
        <TextField
          label="Nombre"
          name="laundry-attribute-create-name"
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
