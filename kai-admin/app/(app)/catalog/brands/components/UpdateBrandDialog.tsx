"use client";

import { useEffect, useState, useTransition } from "react";
import { Dialog } from "@kai/ui";
import { Alert } from "@kai/ui";
import { Button } from "@kai/ui";
import { TextField } from "@kai/ui";
import { Switch } from "@kai/ui";
import type { BrandListItem } from "@/features/catalog-brands/types/brand.types";
import { updateBrandAction } from "@/features/catalog-brands/actions/brand.action";
import { EntityMultimediaPanel } from "../../products/ui/EntityMultimediaPanel";

export type UpdateBrandDialogProps = {
  open: boolean;
  onClose: () => void;
  brand: BrandListItem;
  onSuccess?: () => void | Promise<void>;
};

export function UpdateBrandDialog({ open, onClose, brand, onSuccess }: UpdateBrandDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      return;
    }
    setName(brand.name);
    setDescription(brand.description ?? "");
    setIsActive(brand.isActive !== false);
    setError(null);
  }, [open, brand.id, brand.name, brand.description, brand.isActive]);

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleSubmit = () => {
    setError(null);
    startTransition(() => {
      void (async () => {
        const r = await updateBrandAction({
          id: brand.id,
          name: name.trim(),
          description: description.trim() === "" ? null : description.trim(),
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
      title="Editar marca"
      size="md"
      scroll="paper"
      maxHeight="min(90vh, 560px)"
      data-test-id="brand-update-dialog"
      alertArea={
        error ? (
          <Alert variant="error" data-test-id="brand-update-error">
            {error}
          </Alert>
        ) : null
      }
      actions={
        <>
          <Button variant="outlined" size="md" onClick={handleClose} disabled={isPending} data-test-id="brand-update-cancel">
            Cancelar
          </Button>
          <Button variant="primary" size="md" onClick={handleSubmit} disabled={isPending || !name.trim()} data-test-id="brand-update-submit">
            Guardar
          </Button>
        </>
      }
    >
      <div className="flex w-full min-w-0 flex-col gap-4">
        <TextField
          label="Nombre"
          name="brand-update-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre de la marca"
          required
          data-test-id="brand-update-name"
        />
        <TextField
          label="Descripción"
          name="brand-update-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Opcional"
          rows={3}
          data-test-id="brand-update-description"
        />
        <div className="pt-1">
          <Switch
            checked={isActive}
            onChange={setIsActive}
            label="Activa"
            labelPosition="right"
            data-test-id="brand-update-active"
          />
        </div>
        <EntityMultimediaPanel
          entityType="brand"
          entityId={brand.id}
          title="Logo / imagen de marca"
          collectionOnly
        />
      </div>
    </Dialog>
  );
}
