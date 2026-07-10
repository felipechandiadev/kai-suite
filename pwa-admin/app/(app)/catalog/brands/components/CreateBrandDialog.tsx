"use client";

import { useEffect, useState, useTransition } from "react";
import { Dialog } from "@kai/ui";
import { Alert } from "@kai/ui";
import { Button } from "@kai/ui";
import { TextField } from "@kai/ui";
import { Switch } from "@kai/ui";
import { createBrandAction } from "@/features/catalog-brands/actions/brand.action";

export type CreateBrandDialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void | Promise<void>;
};

export function CreateBrandDialog({ open, onClose, onSuccess }: CreateBrandDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      return;
    }
    setName("");
    setDescription("");
    setIsActive(true);
    setError(null);
  }, [open]);

  const handleClose = () => {
    setName("");
    setDescription("");
    setIsActive(true);
    setError(null);
    onClose();
  };

  const handleSubmit = () => {
    setError(null);
    startTransition(() => {
      void (async () => {
        const r = await createBrandAction({
          name: name.trim(),
          description: description.trim() || null,
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

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Crear marca"
      size="md"
      scroll="paper"
      maxHeight="min(90vh, 560px)"
      data-test-id="brand-create-dialog"
      alertArea={
        error ? (
          <Alert variant="error" data-test-id="brand-create-error">
            {error}
          </Alert>
        ) : null
      }
      actions={
        <>
          <Button variant="outlined" size="md" onClick={handleClose} disabled={isPending} data-test-id="brand-create-cancel">
            Cancelar
          </Button>
          <Button variant="primary" size="md" onClick={handleSubmit} disabled={isPending || !name.trim()} data-test-id="brand-create-submit">
            Crear
          </Button>
        </>
      }
    >
      <div className="flex w-full min-w-0 flex-col gap-4">
        <TextField
          label="Nombre"
          name="brand-create-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre de la marca"
          required
          data-test-id="brand-create-name"
        />
        <TextField
          label="Descripción"
          name="brand-create-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Opcional"
          rows={3}
          data-test-id="brand-create-description"
        />
        <div className="pt-1">
          <Switch
            checked={isActive}
            onChange={setIsActive}
            label="Activa"
            labelPosition="right"
            data-test-id="brand-create-active"
          />
        </div>
      </div>
    </Dialog>
  );
}
